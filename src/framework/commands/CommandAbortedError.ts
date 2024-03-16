import Context from "./Context";

export default class CommandAbortedError extends Error {
    public sendMessage(context: Context) {
        return context.reply(this.message);
    }
}
