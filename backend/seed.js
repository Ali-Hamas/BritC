require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const Service = require('./models/Service');
const Message = require('./models/Message');
const FAQ = require('./models/FAQ');
const TeamMember = require('./models/TeamMember');
const CoreValue = require('./models/CoreValue');
const HomeExpertise = require('./models/HomeExpertise');
const TimelinePhase = require('./models/TimelinePhase');
const WhyReason = require('./models/WhyReason');
const Stat = require('./models/Stat');
const Client = require('./models/Client');
const Tech = require('./models/Tech');
const SiteSetting = require('./models/SiteSetting');
const Section = require('./models/Section');
const Category = require('./models/Category');

// Default Data
const projects = []; 

const services = [
    {
        title: 'Web Excellence',
        type: 'main',
        icon: 'Globe',
        description: 'Next-gen web experiences built for high performance and deep engagement.',
        detailed_desc: 'We craft digital ecosystems that push the boundaries of what is possible on the web. Our approach combines cinematic design with robust architecture, ensuring your presence is not just seen, but felt. From high-conversion SaaS platforms to immersive brand experiences, we build for the future.',
        filter_slug: 'web',
        detailed_features: ['Custom Animations', 'Performance SEO', 'Scalable Backend', 'CMS Integration'],
        process: 'Discovery & Audit, UX/UI Design, Full-Stack Development, QA & Launch',
        pricing: 'Starting at $5,000',
        color: 'from-blue-600 to-cyan-400'
    },
    {
        title: 'Mobile Innovation',
        type: 'main',
        icon: 'Zap',
        description: 'Native and cross-platform mobile apps designed for seamless user journeys.',
        detailed_desc: 'Our mobile solutions are engineered for human interaction. We focus on frictionless UX, battery-efficient performance, and native-feeling interactions. Whether it is iOS, Android, or Flutter, we deliver apps that users love to open every single day.',
        filter_slug: 'app',
        detailed_features: ['Native Performance', 'Push Notifications', 'Offline Capability', 'Biometric Auth'],
        process: 'App Strategy, Wireframing, Agile Development, Beta Testing',
        pricing: 'Starting at $8,000',
        color: 'from-purple-600 to-pink-500'
    },
    {
        title: 'Automation Alpha',
        type: 'main',
        icon: 'Database',
        description: 'Intelligent automation systems that streamline your entire business workflow.',
        detailed_desc: 'Step into the era of efficiency. We build custom AI and automation pipelines that eliminate repetitive tasks, reduce human error, and free your team to focus on high-value work. Our systems integrate deeply with your existing stack for a truly automated future.',
        filter_slug: 'automation',
        detailed_features: ['AI Integration', 'Custom CRM', 'API Orchestration', 'Data Analytics'],
        process: 'Workflow Analysis, Tool Integration, Bot Development, Training',
        pricing: 'Starting at $3,500',
        color: 'from-green-600 to-emerald-400'
    },
    {
        title: 'UI/UX Design',
        type: 'secondary',
        icon: 'Palette',
        description: 'Award-winning interface designs that captivate and convert.',
        detailed_desc: 'Design is more than how it looks—it is how it works. We specialize in psychological design principles that guide user behavior toward your objectives while maintaining a premium aesthetic. Our designs are high-fidelity, motion-inclusive, and user-centric.',
        detailed_features: ['Brand Identity', 'Interaction Design', 'Design Systems', 'Prototyping'],
        process: 'Moodboarding, Lo-Fi Prototyping, Hi-Fi Design, Developer Handoff',
        pricing: 'Starting at $2,500'
    },
    {
        title: 'Brand Growth',
        type: 'secondary',
        icon: 'Target',
        description: 'Strategic marketing that scales your influence and revenue.',
        detailed_desc: 'Data meets creativity. We don\'t just run ads; we build growth engines. Through precise targeting and compelling storytelling, we turn cold leads into loyal brand advocates.',
        detailed_features: ['Growth Hacking', 'Content Strategy', 'Social Mastery', 'PPC Management'],
        process: 'Market Research, Campaign Setup, Scaling, Optimization',
        pricing: 'Starting at $1,500'
    },
    {
        title: 'SEO Mastery',
        type: 'secondary',
        icon: 'Search',
        description: 'Dominating search results with data-backed optimization.',
        detailed_desc: 'Higher rankings, more traffic, better conversions. Our SEO strategy is built on technical excellence and high-authority content, ensuring your brand stays at the top of Google.',
        detailed_features: ['Technical Audit', 'Backlink Strategy', 'On-Page SEO', 'Keyword Research'],
        process: 'Site Analysis, Strategy Building, Implementation, Reporting',
        pricing: 'Starting at $1,200'
    },
    {
        title: 'Cyber Security',
        type: 'secondary',
        icon: 'Shield',
        description: 'Protecting your digital assets with enterprise-grade security.',
        detailed_desc: 'In a world of evolving threats, we keep your data safe. From penetration testing to secure architecture design, we ensure your business is resilient against any cyber attack.',
        detailed_features: ['Vulnerability Assessment', 'Firewall Setup', 'Encryption Systems', 'Security Training'],
        process: 'Threat Modeling, System Hardening, Monitoring, Incident Response',
        pricing: 'Starting at $4,000'
    },
    {
        title: 'Cloud Evolution',
        type: 'secondary',
        icon: 'Database',
        description: 'Seamless cloud migration and infrastructure management.',
        detailed_desc: 'Scale without limits. We help you transition to the cloud or optimize your current infrastructure for cost-efficiency and performance, using AWS, GCP, or Azure.',
        detailed_features: ['Live Migration', 'Serverless Setup', 'Cost Optimization', 'Disaster Recovery'],
        process: 'Infra Audit, Migration Plan, Deployment, Managed Services',
        pricing: 'Starting at $3,000'
    }
];

const faqs = [
    { question: "How long does a typical project take?", answer: "A standard website typically takes 4-6 weeks.", order: 1 },
    { question: "Do you offer post-launch support?", answer: "Yes, we offer tailored maintenance packages.", order: 2 },
    { question: "Can you help with rebranding?", answer: "Yes! Our design team specializes in complete brand identities.", order: 3 },
    { question: "Do you build for mobile?", answer: "Everything we build is mobile-first and responsive.", order: 4 },
    { question: "What is your typical process?", answer: "Discovery, Strategy, Execution, and Launch.", order: 5 },
    { question: "How do you handle payments?", answer: "Usually a 50/50 or milestone-based payment structure.", order: 6 }
];

const team = [
    { name: "Alex Sterling", role: "Founder & CEO", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400", bio: "Visionary leader with 15 years in digital transformation.", order: 1 },
    { name: "Sarah Jenkins", role: "Creative Director", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400", bio: "Award-winning designer obsessed with motion design.", order: 2 },
    { name: "David Kim", role: "Lead Developer", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400", bio: "Full-stack wizard specializing in scalable architecture.", order: 3 },
    { name: "Elena Rodriguez", role: "Strategy Head", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400", bio: "Data-driven strategist helping brands find their voice.", order: 4 },
    { name: "Marcus Chen", role: "UI/UX Designer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400", bio: "Creating immersive interfaces with motion.", order: 5 }
];

const values = [
    { title: "Passion", description: "We pour our heart into every pixel.", icon: "Heart", order: 1 },
    { title: "Innovation", description: "Pushing boundaries with cutting-edge tech.", icon: "Zap", order: 2 },
    { title: "Integrity", description: "Honest and transparent partnership.", icon: "Shield", order: 3 },
    { title: "Precision", description: "Pixel-perfect execution always.", icon: "Target", order: 4 },
    { title: "Impact", description: "Solutions that drive real results.", icon: "Globe", order: 5 }
];

const expertise = [
    { title: 'Development', icon: '⚡', description: 'Crafting high-speed, scalable digital products.', order: 1 },
    { title: 'Design', icon: '🎨', description: 'Immersive interfaces that tell your story.', order: 2 },
    { title: 'Marketing', icon: '📈', description: 'Data-driven growth strategies.', order: 3 }
];

const phases = [
    { phaseNumber: 1, title: "Discovery", description: "Understanding your core problems.", order: 1 },
    { phaseNumber: 2, title: "Strategy", description: "Crafting a visual roadmap.", order: 2 },
    { phaseNumber: 3, title: "Execution", description: "Building robust platforms.", order: 3 },
    { phaseNumber: 4, title: "Refinement", description: "Testing and polishing details.", order: 4 },
    { phaseNumber: 5, title: "Launch", description: "Deploying and optimizing.", order: 5 },
    { phaseNumber: 6, title: "Support", description: "Ongoing maintenance.", order: 6 }
];

const whyReasons = [
    { title: "Precision", desc: "Pixel-perfect execution aligned with your business goals.", icon: "Target", order: 1 },
    { title: "Speed", desc: "Rapid prototyping and deployment without compromising quality.", icon: "Zap", order: 2 },
    { title: "Collaboration", desc: "We work as an extension of your team, not just a vendor.", icon: "Users", order: 3 },
    { title: "Reliability", desc: "24/7 support and 99.9% uptime guarantee for all projects.", icon: "Clock", order: 4 }
];

const stats = [
    { label: "Projects Delivered", value: "50+", order: 1 },
    { label: "Client Retention", value: "98%", order: 2 },
    { label: "Expert Engineers", value: "15+", order: 3 },
    { label: "Cup of Coffee", value: "1.2k", order: 4 }
];

const clients = [
    { name: "TechNova", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=200", order: 1 },
    { name: "GlobalFlow", image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=200", order: 2 },
    { name: "Lumina", image: "https://images.unsplash.com/photo-1614027164847-1b28ccc1217e?auto=format&fit=crop&q=80&w=200", order: 3 },
    { name: "Nexus", image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=200", order: 4 }
];

const techs = [
    { name: "React", order: 1 }, { name: "Next.js", order: 2 }, { name: "Node.js", order: 3 },
    { name: "TypeScript", order: 4 }, { name: "Python", order: 5 }, { name: "AWS", order: 6 },
    { name: "Framer Motion", order: 7 }, { name: "Three.js", order: 8 }, { name: "GraphQL", order: 9 },
    { name: "Docker", order: 10 }, { name: "Figma", order: 11 }, { name: "Tailwind", order: 12 }
];

const categories = [
    { name: 'Web', slug: 'web', order: 1 },
    { name: 'App', slug: 'app', order: 2 },
    { name: 'Automation', slug: 'automation', order: 3 },
    { name: 'Design', slug: 'design', order: 4 },
    { name: 'Social Media', slug: 'social-media', order: 5 },
    { name: 'AI & Machine Learning', slug: 'ai-ml', order: 6 },
    { name: 'Blockchain', slug: 'blockchain', order: 7 },
    { name: 'Cloud Infrastructure', slug: 'cloud-infra', order: 8 },
    { name: 'Cyber Security', slug: 'cyber-security', order: 9 },
    { name: 'Data Analytics', slug: 'data-analytics', order: 10 }
];

const siteSettings = [
    // Hero
    { key: 'hero_title', value: "Crafting Digital\nRealities." },
    { key: 'hero_subtitle', value: "We merge aesthetic perfection with technical brilliance." },
    { key: 'hero_primary_btn', value: "Get Started" },
    { key: 'hero_secondary_btn', value: "Explore Work" },
    // Ticker
    { key: 'ticker_items', value: ["AI Integration", "Digital Strategy", "Next-Gen Web", "Brand Identity", "UX Brilliance", "Cyber Security"] },
    // About
    { key: 'mission_title', value: "Our Mission" },
    { key: 'mission_subtitle', value: "Defining the Future" },
    { key: 'mission_p1', value: "At Britsee, we believe that digital experiences should be as visceral and impactful as physical ones. Our mission is to bridge the gap between human imagination and technological possibility." },
    { key: 'mission_p2', value: "We build systems that don't just solve problems—they create new opportunities for growth, connection, and inspiration." },
    // Contact
    { key: 'contact_title', value: "Let's Talk" },
    { key: 'contact_desc', value: "We'd love to hear about your project. Fill out the form or reach us globally." },
    { key: 'contact_locations', value: "London • New York • Tokyo • Dubai" }
];

const seedDB = async () => {
    try {
        mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for Seeding...');

        // Clear existing data
        await Project.deleteMany({});
        await Service.deleteMany({});
        await FAQ.deleteMany({});
        await TeamMember.deleteMany({});
        await CoreValue.deleteMany({});
        await HomeExpertise.deleteMany({});
        await TimelinePhase.deleteMany({});
        await WhyReason.deleteMany({});
        await Stat.deleteMany({});
        await Client.deleteMany({});
        await Tech.deleteMany({});
        await Category.deleteMany({});
        await SiteSetting.deleteMany({});
 
        // Insert new data
        await Project.insertMany(projects);
        await Service.insertMany(services);
        await FAQ.insertMany(faqs);
        await TeamMember.insertMany(team);
        await CoreValue.insertMany(values);
        await HomeExpertise.insertMany(expertise);
        await TimelinePhase.insertMany(phases);
        await WhyReason.insertMany(whyReasons);
        await Stat.insertMany(stats);
        await Client.insertMany(clients);
        await Tech.insertMany(techs);
        await Category.insertMany(categories);
        await SiteSetting.insertMany(siteSettings);

        console.log('Seeded All Models successfully!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
