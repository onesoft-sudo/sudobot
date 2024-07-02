class ExitError extends Error {
    private code: number = 0;

    public setCode(code: number) {
        this.code = code;
        return this;
    }

    public getCode() {
        return this.code;
    }
}

export default ExitError;
