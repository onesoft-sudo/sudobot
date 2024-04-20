import Application from "@framework/app/Application";
import type BaseClient from "@framework/client/BaseClient";
import { emoji } from "@framework/utils/emoji";
import type {
    Awaitable,
    Interaction,
    InteractionUpdateOptions,
    Message,
    MessageCreateOptions,
    MessageEditOptions,
    MessagePayload
} from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";

type FetcherReturn<T> = {
    data: Iterable<T>;
};
type DataFetcher<T> = () => Promise<FetcherReturn<T>>;
type BuilderOptions<T> = {
    readonly data: Iterable<T>;
    readonly pagination: Pagination<T>;
    readonly state: State;
    readonly maxPages: number;
    readonly page: number;
};
type MessageOptionsBuilder<T> = (options: BuilderOptions<T>) => Awaitable<MessageOptions>;
type ActionRowBuilderCallback = (
    controls: ActionRowBuilder<ButtonBuilder>
) => Awaitable<ActionRowBuilder[]>;
type MessageOptions = MessagePayload | MessageCreateOptions | string;
type State = {
    page: number;
};

class Pagination<T> {
    private static readonly DEFAULT_STATE: State = { page: 1 };
    public static readonly DEFAULT_TIMEOUT = 180_000;

    private readonly id = Date.now().toString();
    private _fetcher?: DataFetcher<T>;
    private _cachedData?: Array<T>;
    private _getCount?: () => Promise<number>;
    private _limit: number = 10;
    private _builder?: MessageOptionsBuilder<T>;
    private _state: State = { ...Pagination.DEFAULT_STATE };
    private _count?: number;
    private _timeout?: ReturnType<typeof setTimeout>;
    private _initialMessage?: Message;
    private _destroyed = false;

    private _actionRowBuilder: ActionRowBuilderCallback = row => [row];
    private _onInteractionHandler = (async (interaction: Interaction) => {
        if (!interaction.isButton() || !interaction.customId.startsWith(this.customId)) {
            return;
        }

        await interaction.deferUpdate();

        const action = interaction.customId.substring(4 + this.id.length);

        if (action === "prev") {
            if (this._state.page > 1) {
                this._state.page--;
            }
        } else if (action === "next") {
            if (this._state.page < (await this.getCount())) {
                this._state.page++;
            }
        } else if (action === "first") {
            this._state.page = 1;
        } else if (action === "last") {
            this._state.page = await this.calculateMaxPages();
        }

        const messageOptions = await this.getMessageOptions();
        await interaction.message.edit(messageOptions as MessagePayload);
    }).bind(this);

    public constructor(protected readonly client: BaseClient = Application.current().client) {
        this.setup();
    }

    private get customId() {
        return `pg_${this.id}`;
    }

    private async getCount() {
        const count = this._cachedData?.length ?? this._count ?? (await this._getCount?.());

        if (count === undefined) {
            throw new Error("No count provided");
        }

        return count;
    }

    public get state() {
        return this._state;
    }

    public get limit() {
        return this._limit;
    }

    public setup() {
        this.client.on(Events.InteractionCreate, this._onInteractionHandler);
    }

    public setMaxTimeout(timeout: number) {
        this._timeout = setTimeout(() => {
            this._timeout = undefined;
            this.destroy();
        }, timeout);

        return this;
    }

    public setFetcher(fetcher: DataFetcher<T>): Pagination<T> {
        this._fetcher = fetcher;
        return this;
    }

    public setCountGetter(getCount: () => Promise<number>): Pagination<T> {
        this._getCount = getCount;
        return this;
    }

    public setInitialMessage(message: Message) {
        this._initialMessage = message;
        return this;
    }

    public setData(data: Iterable<T>): Pagination<T> {
        this._cachedData = Array.isArray(data) ? data : Array.from(data);
        return this;
    }

    public setLimit(limit: number): Pagination<T> {
        this._limit = limit;
        return this;
    }

    public setMessageOptionsBuilder(builder: MessageOptionsBuilder<T>) {
        this._builder = builder;
        return this;
    }

    public setActionRowBuilder(builder: ActionRowBuilderCallback) {
        this._actionRowBuilder = builder;
        return this;
    }

    private async fetch() {
        if (!this._fetcher) {
            throw new Error("No fetcher provided");
        }

        const { data } = await this._fetcher.call(undefined);
        this.setData(data);

        if (this._count === undefined) {
            this._count = this._cachedData!.length;
        }

        return this._cachedData!;
    }

    private calculateOffset(page: number) {
        return (page - 1) * this._limit;
    }

    private async getSlice(page: number): Promise<Array<T>> {
        if (!this._cachedData) {
            throw new Error("No data provided");
        }

        const offset = this.calculateOffset(page);
        return (this._cachedData ?? (await this.fetch())).slice(offset, this._limit + offset);
    }

    public async getMessageOptions(): Promise<MessageOptions> {
        const data = await this.getSlice(this._state.page);

        if (!this._builder) {
            throw new Error("No message options builder provided");
        }

        const options = await this._builder.call(undefined, {
            data,
            pagination: this,
            state: this._state,
            maxPages: await this.calculateMaxPages(),
            page: this._state.page
        });

        if (typeof options === "object") {
            (options as InteractionUpdateOptions).components = <
                InteractionUpdateOptions["components"]
            >await this._actionRowBuilder(await this.getActionRow());
        }

        return options;
    }

    public async destroy() {
        this._destroy();

        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        if (this._initialMessage) {
            const options = await this.getMessageOptions();
            await this._initialMessage?.edit(options as MessageEditOptions);
        }
    }

    private _destroy() {
        this._destroyed = true;
        this.client.off(Events.InteractionCreate, this._onInteractionHandler);
    }

    private async calculateMaxPages() {
        return Math.ceil((await this.getCount()) / this._limit);
    }

    private async getActionRow() {
        const arrowLeftEmoji = emoji(this.client, "ArrowLeft");
        const arrowRightEmoji = emoji(this.client, "ArrowRight");
        const chevronLeftEmoji = emoji(this.client, "ChevronLeft");
        const chevronRightEmoji = emoji(this.client, "ChevronRight");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${this.customId}_first`)
                .setEmoji(
                    arrowLeftEmoji
                        ? {
                              id: arrowLeftEmoji.id,
                              name: arrowLeftEmoji.name ?? arrowLeftEmoji.identifier
                          }
                        : "◁"
                )
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this._destroyed || this._state.page <= 1),
            new ButtonBuilder()
                .setCustomId(`${this.customId}_prev`)
                .setEmoji(
                    chevronLeftEmoji
                        ? {
                              id: chevronLeftEmoji.id,
                              name: chevronLeftEmoji.name ?? chevronLeftEmoji.identifier
                          }
                        : "◀"
                )
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this._destroyed || this._state.page <= 1),
            new ButtonBuilder()
                .setCustomId(`${this.customId}_next`)
                .setEmoji(
                    chevronRightEmoji
                        ? {
                              id: chevronRightEmoji.id,
                              name: chevronRightEmoji.name ?? chevronRightEmoji.identifier
                          }
                        : "▶"
                )
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    this._destroyed || this._state.page >= (await this.calculateMaxPages())
                ),
            new ButtonBuilder()
                .setCustomId(`${this.customId}_last`)
                .setEmoji(
                    arrowRightEmoji
                        ? {
                              id: arrowRightEmoji.id,
                              name: arrowRightEmoji.name ?? arrowRightEmoji.identifier
                          }
                        : "▷"
                )
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    this._destroyed || this._state.page >= (await this.calculateMaxPages())
                )
        );

        return row;
    }

    public static withFetcher<T>(fetcher: DataFetcher<T>): Pagination<T> {
        return new Pagination<T>().setFetcher(fetcher);
    }

    public static withData<T>(data: Iterable<T>): Pagination<T> {
        return new Pagination<T>().setData(data);
    }

    public static of<T>(data: Iterable<T>): Pagination<T> {
        return new Pagination<T>().setData(data);
    }
}

export default Pagination;
