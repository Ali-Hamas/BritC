/**
 * Britsee Google Calendar Service
 * Uses Service Account to manage appointments on noblerootuk@gmail.com calendar
 */

const { google } = require('googleapis');
const path = require('path');
const nodemailer = require('nodemailer');

const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service-account.json');
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'noblerootuk@gmail.com';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const BUSINESS_HOURS = {
    start: 9, 
    end: 18,  
    days: [1, 2, 3, 4, 5] 
};

const APPOINTMENT_DURATION = 30;

let calendarClient = null;

function getCalendarClient() {
    if (calendarClient) return calendarClient;

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: SCOPES,
        });
        calendarClient = google.calendar({ version: 'v3', auth });
        console.log('✅ Google Calendar client initialized');
        return calendarClient;
    } catch (err) {
        console.error('❌ Failed to initialize Google Calendar:', err.message);
        return null;
    }
}

async function getAvailableSlots(date) {
    const client = getCalendarClient();
    if (!client) throw new Error('Calendar not available');

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) throw new Error('Invalid date');

    const dayOfWeek = targetDate.getDay();
    if (!BUSINESS_HOURS.days.includes(dayOfWeek)) {
        return []; 
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(BUSINESS_HOURS.start, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(BUSINESS_HOURS.end, 0, 0, 0);

    let busyTimes = [];
    try {
        const response = await client.freebusy.query({
            requestBody: {
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                items: [{ id: CALENDAR_ID }]
            }
        });
        busyTimes = response.data.calendars[CALENDAR_ID]?.busy || [];
    } catch (err) {
        console.error('Error fetching busy times:', err.message);
    }

    const slots = [];
    const current = new Date(startOfDay);

    while (current < endOfDay) {
        const slotEnd = new Date(current.getTime() + APPOINTMENT_DURATION * 60000);

        const isBusy = busyTimes.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return current < busyEnd && slotEnd > busyStart;
        });

        if (!isBusy) {
            const hour = current.getHours();
            const minute = current.getMinutes();
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const displayMin = minute === 0 ? '00' : minute;
            slots.push(`${displayHour}:${displayMin} ${ampm}`);
        }

        current.setTime(current.getTime() + APPOINTMENT_DURATION * 60000);
    }

    return slots;
}

async function bookAppointment({ name, email, phone, service, date, time }) {
    const client = getCalendarClient();
    if (!client) throw new Error('Calendar not available');

    const [timePart, ampm] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const appointmentDate = new Date(date);
    appointmentDate.setHours(hours, minutes, 0, 0);
    const appointmentEnd = new Date(appointmentDate.getTime() + APPOINTMENT_DURATION * 60000);

    const event = {
        summary: `Discovery Call — ${name} (${service})`,
        description: `
📋 Appointment Details:
• Name: ${name}
• Email: ${email}
• Phone: ${phone}
• Service Interest: ${service}
• Booked via: BritSync Chatbot
        `.trim(),
        start: {
            dateTime: appointmentDate.toISOString(),
            timeZone: 'Europe/London',
        },
        end: {
            dateTime: appointmentEnd.toISOString(),
            timeZone: 'Europe/London',
        },
        attendees: [
            { email: email, displayName: name },
        ],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 }, 
                { method: 'email', minutes: 60 },       
                { method: 'popup', minutes: 30 },
            ],
        },
        conferenceData: {
            createRequest: {
                requestId: `britsee-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        }
    };

    const response = await client.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', 
    });

    const createdEvent = response.data;
    const meetLink = createdEvent.conferenceData?.entryPoints?.[0]?.uri || null;

    return {
        eventId: createdEvent.id,
        eventLink: createdEvent.htmlLink,
        meetLink,
        startTime: appointmentDate,
        endTime: appointmentEnd,
    };
}

async function sendConfirmationEmail({ name, email, phone, service, date, time, meetLink, eventLink }) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER || 'britsyncuk@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD || '',
        }
    });

    const dateStr = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #800020 0%, #00BFFF 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 26px;">✅ Appointment Confirmed!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your discovery call with Britsee is booked.</p>
        </div>
        <div style="background: #fff; padding: 35px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #555;">We're excited to speak with you! Here are your appointment details:</p>

            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 25px 0; border-left: 4px solid #00BFFF;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 130px;">📅 Date</td><td style="font-weight: 600; font-size: 15px;">${dateStr}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">🕐 Time</td><td style="font-weight: 600; font-size: 15px;">${time} (UK Time)</td></tr>
                    <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">⏱ Duration</td><td style="font-weight: 600; font-size: 15px;">30 minutes</td></tr>
                    <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">🎯 Topic</td><td style="font-weight: 600; font-size: 15px;">${service}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">📞 Your Phone</td><td style="font-weight: 600; font-size: 15px;">${phone}</td></tr>
                </table>
            </div>

            ${meetLink ? `
            <div style="text-align: center; margin: 25px 0;">
                <a href="${meetLink}" style="background: #00BFFF; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                    🎥 Join Google Meet
                </a>
                <p style="color: #999; font-size: 13px; margin-top: 10px;">Or copy this link: <a href="${meetLink}" style="color: #00BFFF;">${meetLink}</a></p>
            </div>
            ` : ''}

            <div style="background: #fff8e1; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #FFC107;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>📬 Reminders:</strong> You'll receive automated reminders 24 hours and 1 hour before your call. A Google Calendar invite has been sent to your email.
                </p>
            </div>

            <p style="font-size: 15px; color: #333;">Need to reschedule? Reply to this email or contact us at <a href="mailto:britsyncuk@gmail.com" style="color: #00BFFF;">britsyncuk@gmail.com</a></p>

            <p style="font-size: 15px; margin-top: 25px;">
                Looking forward to speaking with you! 🚀<br><br>
                <strong>The BritSync Team</strong><br>
                <span style="color: #00BFFF; font-size: 14px;">Crafting Digital Realities</span>
            </p>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} BritSync. All rights reserved.</p>
    </div>
    `;

    await transporter.sendMail({
        from: `Britsee <${process.env.GMAIL_USER || 'britsyncuk@gmail.com'}>`,
        to: email,
        subject: `✅ Your Britsee Discovery Call is Confirmed — ${dateStr} at ${time}`,
        html,
    });

    await transporter.sendMail({
        from: process.env.GMAIL_USER || 'britsyncuk@gmail.com',
        to: process.env.GMAIL_RECEIVER || 'britsyncuk@gmail.com',
        subject: `📅 New Booking: ${name} — ${dateStr} at ${time}`,
        html: `
            <h2>New Appointment Booked via Chatbot</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${time}</p>
            ${meetLink ? `<p><strong>Meet Link:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
            ${eventLink ? `<p><strong>Calendar Event:</strong> <a href="${eventLink}">View on Google Calendar</a></p>` : ''}
        `,
    });
}

function parseDate(input) {
    if (!input) return null;

    let clean = input.toLowerCase().trim()
        .replace(/\bat\b/g, '')
        .replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '')
        .replace(/\b(morning|afternoon|evening|night|noon|midnight)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const now = new Date();
    now.setHours(12, 0, 0, 0); 

    if (/^today$/.test(clean)) return new Date(now);

    if (/^tomorrow$/.test(clean)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d;
    }

    const inDaysMatch = clean.match(/^in\s+(\d+)\s+days?$/);
    if (inDaysMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
        return d;
    }

    if (/^next\s+week$/.test(clean)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        return d;
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
        if (clean.includes(dayNames[i])) {
            const d = new Date(now);
            let diff = (i - d.getDay() + 7) % 7;
            if (diff === 0) diff = 7; 
            d.setDate(d.getDate() + diff);
            return d;
        }
    }

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (let m = 0; m < months.length; m++) {
        if (clean.includes(months[m])) {
            const dayMatch = clean.match(/(\d{1,2})(st|nd|rd|th)?/);
            if (dayMatch) {
                const day = parseInt(dayMatch[1]);
                const year = clean.match(/\b(202\d)\b/) ? parseInt(clean.match(/\b(202\d)\b/)[1]) : now.getFullYear();
                const candidate = new Date(year, m, day, 12);
                if (candidate < now) candidate.setFullYear(year + 1);
                return candidate;
            }
        }
    }

    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
        const a = parseInt(slashMatch[1]);
        const b = parseInt(slashMatch[2]);
        const yr = slashMatch[3] ? parseInt(slashMatch[3]) : now.getFullYear();
        const day = a <= 12 ? b : a; 
        const mon = a <= 12 ? a - 1 : b - 1;
        return new Date(yr > 99 ? yr : 2000 + yr, mon, day, 12);
    }

    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
        parsed.setHours(12, 0, 0, 0);
        return parsed;
    }

    return null;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

module.exports = {
    getAvailableSlots,
    bookAppointment,
    sendConfirmationEmail,
    parseDate,
    formatDate,
    getCalendarClient,
};
