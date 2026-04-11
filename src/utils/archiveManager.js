const fs = require('fs');
const path = require('path');

const ARCHIVE_PATH = path.join(__dirname, '../../data/closedTickets.json');

function readArchive() {
    if (!fs.existsSync(ARCHIVE_PATH)) {
        fs.writeFileSync(ARCHIVE_PATH, '[]', 'utf8');
    }
    return JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
}

function writeArchive(entries) {
    fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function archiveClosedTicket(ticket, meta = {}) {
    const entries = readArchive();
    const archived = {
        archivedAt: new Date().toISOString(),
        closedBy: meta.closedBy || null,
        closeSource: meta.closeSource || 'unknown',
        ...ticket,
    };

    const index = entries.findIndex((e) => e.id === ticket.id);
    if (index >= 0) {
        entries[index] = archived;
    } else {
        entries.push(archived);
    }

    writeArchive(entries);
    return archived;
}

module.exports = {
    archiveClosedTicket,
    readArchive,
};
