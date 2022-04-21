module.exports = {
    escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
};