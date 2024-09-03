import { Action } from "@framework/api/decorators/Action";
import Controller from "@framework/api/http/Controller";

class AnnouncementController extends Controller {
    @Action("GET", "/announcements/latest")
    public async getLatest() {
        return {
            title: "Announcement",
            content:
                "We're here to announce that SudoBot 10.x \"Delicious Donut\" is now available! 🎉🍰🎉\n\nThis release adds a bunch of new features, and performance fixes. We're open to any questions or suggestions as always, feel free to contact us anytime! We hope you have a great day.",
            from: "rakinar2",
            timestamp: 1725385295628
        };
    }
}

export default AnnouncementController;
