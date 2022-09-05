export default class Route {
    constructor(public readonly method: string, public readonly path: string, public readonly callback: [Object, string], public middlewareList: Array<Object> = []) {

    }

    middleware(...middleware: Object[]) {
        this.middlewareList = [...this.middlewareList, ...middleware];
    }

    getCallbackFunction(...args: any[]) {
        const [controller, method] = this.callback;
        return () => (controller as { [key: string]: Function })[method].call(controller, ...args);
    }
}