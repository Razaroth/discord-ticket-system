const fs = require('fs');
const path = require('path');

const TICKETS_PATH = path.join(__dirname, '../../data/tickets.json');

function readTickets() {
    if (!fs.existsSync(TICKETS_PATH)) {
        fs.writeFileSync(TICKETS_PATH, '{}', 'utf8');
    }
    return JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
}

function writeTickets(tickets) {
    fs.writeFileSync(TICKETS_PATH, JSON.stringify(tickets, null, 2), 'utf8');
}

function generateTicketNumber(tickets) {
    const numbers = Object.values(tickets).map(t => t.ticketNumber).filter(Boolean);
    return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

function createTicket(channelId, data) {
    const tickets = readTickets();
    tickets[channelId] = {
        id: channelId,
        ticketNumber: generateTicketNumber(tickets),
        userId: data.userId,
        username: data.username,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel,
        issue: data.issue,
        preTestChecklist: data.preTestChecklist,
        priority: data.priority,
        status: 'Open',
        assignedTo: null,
        assignedName: null,
        dueDate: null,
        techNotes: [],
        embedMessageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    writeTickets(tickets);
    return tickets[channelId];
}

function getTicket(channelId) {
    return readTickets()[channelId] || null;
}

function updateTicket(channelId, updates) {
    const tickets = readTickets();
    if (!tickets[channelId]) return null;
    tickets[channelId] = {
        ...tickets[channelId],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    writeTickets(tickets);
    return tickets[channelId];
}

function deleteTicket(channelId) {
    const tickets = readTickets();
    const ticket = tickets[channelId];
    delete tickets[channelId];
    writeTickets(tickets);
    return ticket;
}

function getAllTickets() {
    return Object.values(readTickets());
}

module.exports = { createTicket, getTicket, updateTicket, deleteTicket, getAllTickets };
