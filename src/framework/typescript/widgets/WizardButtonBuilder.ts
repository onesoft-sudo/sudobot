/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { ButtonBuilder } from "discord.js";

class WizardButtonBuilder extends ButtonBuilder {
    private _customId?: string;
    private _handler?: string;

    public override setCustomId(customId: string): this {
        this._customId = customId;
        return super.setCustomId(customId);
    }

    public get customId(): string {
        return this._customId!;
    }

    public setHandler(handler: string): this {
        this._handler = handler;
        return this;
    }

    public get handler(): string {
        return this._handler!;
    }
}

export default WizardButtonBuilder;
