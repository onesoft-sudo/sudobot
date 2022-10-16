import MessageEmbed from "../../client/MessageEmbed";

export default function reply(description: string, color = 0x007bff) {
    return new MessageEmbed({ color, description });
}   