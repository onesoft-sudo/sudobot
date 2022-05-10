module.exports = {
    escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    timeSince(date) {
        const seconds = Math.floor((Date.now() - date) / 1000);
        let interval = seconds / (60 * 60 * 24 * 30 * 365);
      
        if (interval > 1) {
          return Math.floor(interval) + " year" + (Math.floor(interval) === 1 ? '' : 's');
        }

        interval = seconds / (60 * 60 * 24 * 30);

        if (interval > 1) {
          return Math.floor(interval) + " month" + (Math.floor(interval) === 1 ? '' : 's');
        }

        interval = seconds / (60 * 60 * 24);

        if (interval > 1) {
          return Math.floor(interval) + " day" + (Math.floor(interval) === 1 ? '' : 's');
        }

        interval = seconds / (60 * 60);

        if (interval > 1) {
          return Math.floor(interval) + " hour" + (Math.floor(interval) === 1 ? '' : 's');
        }

        interval = seconds / 60;

        if (interval > 1) {
          return Math.floor(interval) + " minute" + (Math.floor(interval) === 1 ? '' : 's');
        }

        interval = seconds;

        return Math.floor(interval) + " second" + (Math.floor(interval) === 1 ? '' : 's');
      }
};