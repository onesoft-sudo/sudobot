import { User } from "discord.js";
import { Policy } from "../framework/policies/Policy";

class BallotPolicy extends Policy {
    public canVote(_user: User) {}
}

export default BallotPolicy;
