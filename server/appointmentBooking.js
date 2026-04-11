/**
 * Britsee Appointment Booking Flow
 * Returns AI prompts for Groq to generate human-like responses
 */

const {
    getAvailableSlots,
    bookAppointment,
    sendConfirmationEmail,
    parseDate,
    formatDate,
} = require('./calendarService');

const bookingFlows = new Map();

const SERVICES = [
    'Web Development',
    'AI Automation',
    'Mobile App Development',
    'Digital Marketing',
    'E-Commerce Solutions',
    'UI/UX Design',
    'General / Not sure yet',
];

function isInAppointmentFlow(sessionId) {
    return bookingFlows.has(sessionId);
}

function shouldStartAppointment(message) {
    const lower = message.toLowerCase();
    const triggers = [
        'book', 'schedule', 'appointment', 'call', 'meeting', 'discovery',
        'talk to someone', 'speak to', 'consult', 'free call', 'chat with',
        'get in touch', 'arrange', 'set up a call'
    ];
    return triggers.some(t => lower.includes(t));
}

/**
 * Start booking flow — returns an AI prompt object
 * Checks if user provided details in the initial message (e.g. "Book AI Automation next Friday 2pm")
 */
function startAppointmentFlow(sessionId, userMessage = '') {
    const flow = { step: 'ask_name', data: {} };
    let extractedInfo = [];

    const lower = userMessage.toLowerCase();

    // 1. Try to extract Service
    const matchedService = SERVICES.find(s =>
        lower.includes(s.toLowerCase()) ||
        (s.length > 10 && lower.includes(s.toLowerCase().substring(0, 10)))
    );
    if (matchedService) {
        flow.data.service = matchedService;
        extractedInfo.push(`Service: ${matchedService}`);
    }

    // 2. Try to extract Date (using the NLP parser)
    if (/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|week|month|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|in \d+ days)/i.test(lower)) {
        const parsedDate = parseDate(userMessage);
        if (parsedDate) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const day = parsedDate.getDay();
            if (parsedDate >= today && day !== 0 && day !== 6) {
                flow.data.date = parsedDate;
                extractedInfo.push(`Date: ${formatDate(parsedDate)}`);
            }
        }
    }

    // 3. Try to extract Time (only if date was found)
    if (flow.data.date) {
        const timeMatch = userMessage.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ap = timeMatch[3].toUpperCase();
            if (ap === 'PM' && h !== 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            const displayM = String(m).padStart(2, '0');
            flow.data.time = `${displayH}:${displayM} ${ap}`;
            extractedInfo.push(`Time: ${flow.data.time}`);
        }
    }

    bookingFlows.set(sessionId, flow);

    const context = extractedInfo.length > 0
        ? `I understood you want to book: ${extractedInfo.join(', ')}. `
        : '';

    return {
        aiPrompt: `${context}Greet the user warmly (Britsee). tell them you can book a free 30-minute discovery call. Ask for their full name to get started. Be natural.`,
        fallback: "I'd love to book a free 30-minute discovery call for you! What's your full name?"
    };
}

function cancelAppointmentFlow(sessionId) {
    bookingFlows.delete(sessionId);
}

function getCurrentStepQuestion(sessionId) {
    const flow = bookingFlows.get(sessionId);
    if (!flow) return null;
    const questions = {
        ask_name: 'What is your full name?',
        ask_email: 'What is your email address?',
        ask_phone: 'What is your phone number?',
        ask_service: 'Which service are you interested in? (say a number 1-7)',
        ask_date: 'What date would you like to book (e.g. "Monday" or "25 Feb")?',
        ask_time: 'What time works for you?',
        confirm: 'Type "confirm" to book or "cancel" to start over.',
    };
    return questions[flow.step] || null;
}

async function processAppointmentStep(sessionId, userInput) {
    const flow = bookingFlows.get(sessionId);
    if (!flow) return null;

    const input = userInput.trim();

    if (/^(wait|hold on|one sec|just a sec|hang on|give me a min|not yet|pause|later|i will tell you)/i.test(input)) {
        return {
            state: 'waiting',
            aiPrompt: 'The user asked to wait or pause. Respond with a very short, friendly "No problem, take your time!".',
            fallback: "No problem! Take your time. 😊"
        };
    }

    switch (flow.step) {
        case 'ask_name': {
            if (input.length < 2 || /^(no|nope|idk|dont know|tell you)/i.test(input)) {
                return {
                    state: 'validation_error',
                    aiPrompt: 'The user gave an unclear response instead of a name. Politely ask them again for their full name. Keep it very brief.',
                    fallback: "Could you share your full name please? 😊"
                };
            }
            flow.data.name = input;
            flow.step = 'ask_email';
            return {
                state: 'collecting',
                aiPrompt: `User said their name is "${input}". Acknowledge their name warmly (use it once), then ask for their email address — we need it to send a booking confirmation. Be brief and friendly, one or two sentences.`,
                fallback: `Great to meet you, ${input}! What's your email address so we can send your confirmation?`
            };
        }

        case 'ask_email': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input)) {
                return {
                    state: 'validation_error',
                    aiPrompt: 'The user gave an invalid email address. Politely ask them to double-check and provide a valid email. One sentence.',
                    fallback: "That email doesn't look right — could you double-check it? 📧"
                };
            }
            flow.data.email = input;
            flow.step = 'ask_phone';
            return {
                state: 'collecting',
                aiPrompt: `User provided email "${input}". Confirm you got it and ask for their phone number (in case the team needs to reach them). One or two short friendly sentences.`,
                fallback: `Perfect, got it! What's your phone number in case we need to reach you?`
            };
        }

        case 'ask_phone': {
            if (input.replace(/[\s\-\+\(\)]/g, '').length < 7) {
                return {
                    state: 'validation_error',
                    aiPrompt: 'The user gave a phone number that seems too short or invalid. Politely ask for a valid phone number. One sentence.',
                    fallback: "Could you give me a valid phone number? 📞"
                };
            }
            flow.data.phone = input;

            if (flow.data.service) {
                if (flow.data.date) {
                    try {
                        const slots = await getAvailableSlots(flow.data.date);
                        flow.data.availableSlots = slots || [];

                        if (flow.data.time) {
                            flow.step = 'confirm';
                            return {
                                state: 'collecting',
                                aiPrompt: `We have all details! User wants ${flow.data.service} on ${formatDate(flow.data.date)} at ${flow.data.time} UK time. Summarise these details cleanly and ask them to type "confirm" to finalize.`,
                                fallback: `Got it! Here's the plan:\n\n• Service: ${flow.data.service}\n• Date: ${formatDate(flow.data.date)}\n• Time: ${flow.data.time}\n\nType "confirm" to book!`
                            };
                        }

                        flow.step = 'ask_time';
                        const slotDisplay = slots.length > 0
                            ? slots.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join('\n')
                            : 'No slots found (check another date?)';

                        return {
                            state: 'collecting',
                            aiPrompt: `User chosen date available. Mention ${formatDate(flow.data.date)} is open and list these times: ${slots.slice(0, 3).join(', ')} etc. Ask what time works.`,
                            fallback: `Here are times for ${formatDate(flow.data.date)}:\n\n${slotDisplay}\n\nWhich looks good?`
                        };

                    } catch (err) {
                        flow.step = 'ask_date';
                        return {
                            state: 'collecting',
                            aiPrompt: `User wanted ${formatDate(flow.data.date)} but we couldn't check availability. Ask them to confirm the date again.`,
                            fallback: `Just to double check — what date would you like to book?`
                        };
                    }
                }

                flow.step = 'ask_date';
                return {
                    state: 'collecting',
                    aiPrompt: `User chose "${flow.data.service}". Ask what date they'd like (e.g. "tomorrow", "Monday").`,
                    fallback: `Excellent! For ${flow.data.service}, what date works best for you?`
                };
            }

            flow.step = 'ask_service';
            const serviceList = SERVICES.map((s, i) => `${i + 1}. ${s}`).join('\n');
            return {
                state: 'collecting',
                aiPrompt: `Got the user's phone number. Now ask which service they're interested in. Present these options naturally:\n${serviceList}\nTell them to type a number or service name. Be friendly and brief.`,
                fallback: `Got it! Which service interests you?\n\n${serviceList}\n\nJust type the number or name!`
            };
        }

        case 'ask_service': {
            const num = parseInt(input);
            if (!isNaN(num) && num >= 1 && num <= SERVICES.length) {
                flow.data.service = SERVICES[num - 1];
            } else {
                const matched = SERVICES.find(s =>
                    s.toLowerCase().includes(input.toLowerCase()) ||
                    input.toLowerCase().includes(s.toLowerCase().split(' ')[0])
                );
                if (matched) {
                    flow.data.service = matched;
                } else {
                    const serviceList = SERVICES.map((s, i) => `${i + 1}. ${s}`).join('\n');
                    return {
                        state: 'validation_error',
                        aiPrompt: `User gave an unclear service choice. Ask them to pick from this list:\n${serviceList}\nBe friendly and brief.`,
                        fallback: `Please pick a number from 1 to 7:\n\n${serviceList}`
                    };
                }
            }

            if (flow.data.date) {
                try {
                    const slots = await getAvailableSlots(flow.data.date);
                    flow.data.availableSlots = slots || [];

                    if (flow.data.time) {
                        flow.step = 'confirm';
                        return {
                            state: 'collecting',
                            aiPrompt: `We have all details! User wants ${flow.data.service} on ${formatDate(flow.data.date)} at ${flow.data.time} UK time. Summarise details and ask to confirm.`,
                            fallback: `Got it! ${flow.data.service} on ${formatDate(flow.data.date)} at ${flow.data.time}?\n\nType "confirm" to book!`
                        };
                    }

                    flow.step = 'ask_time';
                    const slotDisplay = slots.length > 0
                        ? slots.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join('\n')
                        : 'No slots found.';

                    return {
                        state: 'collecting',
                        aiPrompt: `User chosen date available. Mention ${formatDate(flow.data.date)} is open and list times: ${slots.slice(0, 3).join(', ')}. Ask what time works.`,
                        fallback: `Here are times for ${formatDate(flow.data.date)}:\n\n${slotDisplay}\n\nWhich looks good?`
                    };

                } catch (err) {
                    flow.step = 'ask_date';
                    return {
                        state: 'collecting',
                        aiPrompt: `User wanted ${formatDate(flow.data.date)} but we couldn't check availability. Ask them to confirm date again.`,
                        fallback: `Just to double check — what date would you like to book?`
                    };
                }
            }

            flow.step = 'ask_date';
            return {
                state: 'collecting',
                aiPrompt: `User chose "${flow.data.service}". Express enthusiasm for their choice and ask what date they'd like for the 30-min call. Mention they can say things like "tomorrow", "Monday", or "25 Feb". We're available Mon-Fri 9am-6pm UK time. Be brief and friendly.`,
                fallback: `Excellent choice — ${flow.data.service}! What date works for you? (e.g. "tomorrow", "Monday", "25 Feb")`
            };
        }

        case 'ask_date': {
            const parsedDate = parseDate(input);
            if (!parsedDate) {
                return {
                    state: 'validation_error',
                    aiPrompt: `User gave an unclear date input: "${input}". Ask them to try again with something like "tomorrow", "Monday", "next Friday", or "25 Feb". One friendly sentence.`,
                    fallback: "I didn't quite catch that. Try saying something like \"tomorrow\", \"Monday\", or \"25 Feb\" 📅"
                };
            }
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (parsedDate < today) {
                return {
                    state: 'validation_error',
                    aiPrompt: "User picked a date in the past. Gently say that and ask for a future date. One sentence.",
                    fallback: "That date's in the past — please choose an upcoming date 📅"
                };
            }
            const day = parsedDate.getDay();
            if (day === 0 || day === 6) {
                return {
                    state: 'validation_error',
                    aiPrompt: 'User picked a weekend. Politely say we only run Mon-Fri and ask for a weekday. One sentence.',
                    fallback: "We're only available Mon-Fri! Could you pick a weekday? 📅"
                };
            }

            flow.data.date = parsedDate;

            const timeInInput = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
            if (timeInInput) {
                let h = parseInt(timeInInput[1]);
                const m = timeInInput[2] ? parseInt(timeInInput[2]) : 0;
                const ap = timeInInput[3].toUpperCase();
                if (ap === 'PM' && h !== 12) h += 12;
                if (ap === 'AM' && h === 12) h = 0;
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                const displayM = String(m).padStart(2, '0');
                flow.data.time = `${displayH}:${displayM} ${ap}`;
                flow.step = 'confirm';
                return {
                    state: 'collecting',
                    aiPrompt: `User combined date and time. Summarise and ask them to type "confirm" to book or "cancel" to change something. Present it cleanly.`,
                    fallback: `Got it! Here's your booking so far:\n\n• Date: ${formatDate(parsedDate)}\n• Time: ${flow.data.time} (UK)\n• Service: ${flow.data.service}\n\nType "confirm" to book or "cancel" to change!`
                };
            }

            flow.step = 'ask_time';
            try {
                const slots = await getAvailableSlots(parsedDate);
                if (slots.length === 0) {
                    flow.step = 'ask_date';
                    return {
                        state: 'validation_error',
                        aiPrompt: `${formatDate(parsedDate)} is fully booked. Say sorry and ask for a different date. One sentence.`,
                        fallback: `${formatDate(parsedDate)} is fully booked — could you try another date? 📅`
                    };
                }
                flow.data.availableSlots = slots;
                const slotDisplay = slots.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join('\n');
                return {
                    state: 'collecting',
                    aiPrompt: `${formatDate(parsedDate)} looks good! Present these available times and ask which one they'd like:\n${slotDisplay}\nTell them to type the number or time directly.`,
                    fallback: `Here are the available times for ${formatDate(parsedDate)}:\n\n${slotDisplay}\n\nWhich time works for you?`
                };
            } catch (err) {
                flow.data.availableSlots = null;
                return {
                    state: 'collecting',
                    aiPrompt: `User wants to book on ${formatDate(parsedDate)}. Ask what time between 9 AM and 6 PM UK time suits them. One friendly sentence.`,
                    fallback: `What time works for you on ${formatDate(parsedDate)}? We're available 9 AM - 6 PM UK time.`
                };
            }
        }

        case 'ask_time': {
            let chosenTime = null;
            const match = input.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
            
            if (match) {
                let h = parseInt(match[1]);
                const m = match[2] ? parseInt(match[2]) : 0;
                let ap = (match[3] || (h >= 12 ? 'PM' : 'AM')).toUpperCase();
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                const displayM = String(m).padStart(2, '0');
                chosenTime = `${displayH}:${displayM} ${ap}`;
            } else {
                const num = parseInt(input);
                if (!isNaN(num) && flow.data.availableSlots && num >= 1 && num <= flow.data.availableSlots.length) {
                    chosenTime = flow.data.availableSlots[num - 1];
                }
            }

            if (!chosenTime) {
                return {
                    state: 'validation_error',
                    aiPrompt: `User gave an unclear time. Ask them to type a specific time like "10:00 AM" or "2:30 PM". One sentence.`,
                    fallback: `Please type a time like "10:00 AM" or "2:30 PM" ⏰`
                };
            }

            flow.data.time = chosenTime;
            flow.step = 'confirm';

            return {
                state: 'collecting',
                aiPrompt: `User picked ${chosenTime}. Now summarise their booking details clearly and ask them to confirm or cancel. Ask them to type "confirm" to book or "cancel" to change something. Present it cleanly.`,
                fallback: `Almost done! Here's your booking:\n\n• Name: ${flow.data.name}\n• Email: ${flow.data.email}\n• Phone: ${flow.data.phone}\n• Service: ${flow.data.service}\n• Date: ${formatDate(flow.data.date)}\n• Time: ${chosenTime} (UK)\n• Duration: 30 mins via Google Meet\n\nType "confirm" to book or "cancel" to start over!`
            };
        }

        case 'confirm': {
            const lower = input.toLowerCase();
            if (lower.includes('confirm') || lower === 'yes') {
                flow.step = 'booking';
                try {
                    const booking = await bookAppointment({
                        name: flow.data.name,
                        email: flow.data.email,
                        phone: flow.data.phone,
                        service: flow.data.service,
                        date: flow.data.date,
                        time: flow.data.time,
                    });

                    await sendConfirmationEmail({
                        ...flow.data,
                        meetLink: booking.meetLink,
                        eventLink: booking.eventLink,
                    });

                    bookingFlows.delete(sessionId);
                    return {
                        state: 'complete',
                        aiPrompt: `Booking confirmed! A confirmation email was sent to ${flow.data.email}. Their video call link is: ${booking.meetLink}. Celebrate warmly and mention the Meet link.`,
                        fallback: `🎉 You're booked! Your discovery call is confirmed for ${formatDate(flow.data.date)} at ${flow.data.time} (UK time).\n\nJoin the call here: ${booking.meetLink}\n\nA confirmation email has been sent to ${flow.data.email}. Looking forward to speaking with you! 🚀`
                    };

                } catch (err) {
                    bookingFlows.delete(sessionId);
                    return {
                        state: 'failed',
                        aiPrompt: 'Something went wrong with the booking. Apologise warmly and ask them to email support@britsee.co.',
                        fallback: `So sorry — something went wrong! Please email support@britsee.co and we'll sort your booking right away. 😔`
                    };
                }
            } else if (lower.includes('cancel') || lower === 'no') {
                bookingFlows.delete(sessionId);
                return {
                    state: 'cancelled',
                    aiPrompt: 'User wants to cancel. Acknowledge kindly and offer help. One short sentence.',
                    fallback: "No problem at all! Feel free to book anytime. How else can I help? 😊"
                };
            } else {
                return {
                    state: 'validation_error',
                    aiPrompt: 'User gave an unclear response. Remind them to type "confirm" or "cancel".',
                    fallback: `Just type "confirm" to book or "cancel" to start over!`
                };
            }
        }

        default:
            bookingFlows.delete(sessionId);
            return null;
    }
}

module.exports = {
    isInAppointmentFlow,
    shouldStartAppointment,
    startAppointmentFlow,
    cancelAppointmentFlow,
    processAppointmentStep,
    getCurrentStepQuestion,
};
