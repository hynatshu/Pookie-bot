// utils/auditHelpers.js
module.exports = {
    async fetchAuditExecutor(guild, type, limit = 1) {
        try {
            const logs = await guild.fetchAuditLogs({ type, limit });
            const entry = logs.entries.first();
            if (!entry) return null;
            return entry.executor;
        } catch (err) {
            return null;
        }
    }
};
