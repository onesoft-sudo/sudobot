class InvalidStateError extends Error {
    public constructor(message = "An invalid state has been reached", options?: ErrorOptions) {
        super(message, options);
    }
}

export default InvalidStateError;
