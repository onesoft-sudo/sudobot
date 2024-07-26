class ParserConfigError extends Error {
    public constructor(message: string) {
        super(message + "\nThis is a bug. If you're not a developer, you should report this.");
    }
}

export default ParserConfigError;
