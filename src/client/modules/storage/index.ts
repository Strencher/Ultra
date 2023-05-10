import {Module} from "@structs";
import {StringUtils, path} from "@utilities";

const {UltraNative} = window;

const Storage = new class Storage extends Module {
    path: string;
    errors: {
        error: Error,
        message: string
    }[];
    #defaultItems = new Set(["settings.json", "plugins.json", "themes.json"]);
    data: any = {};

    constructor() {
        super();

        this.path = path.join(UltraNative.getPath("appData"), "ultra", "storage");

        this.#sanityCheck();
        this.#loadData();
    }

    #fail(message: string, error: Error) {
        this.error(message, error);
        this.errors.push({message, error});
    }

    #loadData() {
        const dirents = UltraNative.readdir(this.path)
            .filter(item => UltraNative.getDirentInfo(path.join(this.path, item)).isFile())
            .filter(item => path.extname(item) === ".json");

        for (const dirent of dirents) {
            const name = dirent.slice(0, dirent.indexOf("."));

            let data: any;

            try {
                data = JSON.parse(StringUtils.fromBinary(UltraNative.readFile(path.join(this.path, dirent))));
            } catch (error) {
                this.#fail(`Failed to load ${dirent} storage file!`, error);
                continue;
            }

            this.data[name] = data;
        }
    }

    #sanityCheck() {
        if (!UltraNative.existsDirent(this.path)) {
            try {
                UltraNative.createFolder(this.path, true);
            } catch (error) {
                this.#fail("Failed to create storage folder!", error);
                return;
            }
        }

        for (const item of this.#defaultItems) {
            const location = path.join(this.path, item);

            if (UltraNative.existsDirent(location)) continue;

            try {
                UltraNative.writeFile(location, StringUtils.toBinary(["plugins.json", "themes.json"].includes(item) ? "[]" : "{}"));
                this.data[item.slice(0, item.indexOf("."))] = {};

                this.info(`Created ${item} storage file!`);
            } catch (error) {
                this.#fail(`Failed to create ${item} storage file!`, error);
                return;
            }
        }
    }

    getData(key: string, fallback: any) {
        if (this.data[key]) return this.data[key];

        return fallback;
    }

    setData(key: string, data: any) {
        this.data[key] = data;
        this.#writeData(key);
    }

    #writeData(key: string) {
        try {
            UltraNative.writeFile(path.join(this.path, `${key}.json`), StringUtils.toBinary(JSON.stringify(this.data[key])));
        } catch (error) {
            this.error(`Failed to save ${key}.json storage file!`, error);
        }
        this.emit("updated", key);
    }

    // Aliases

    getPluginStates = () => {
        return this.data.plugins ?? [];
    }

    setPluginStates = (states: string[]) => {
        this.data.plugins = states;
        this.#writeData("plugins");
    }   

    getThemesStates = () => {
        return this.data.themes ?? [];
    }

    setThemesStates = (states: string[]) => {
        this.data.themes = states;
        this.#writeData("themes");
    } 

    getSetting(id: string, fallback: any) {
        return this.data.settings?.[id] ?? fallback;
    }

    updateSetting(id: string, data: any) {
        this.data.settings ??= {};
        this.data.settings[id] = data;
        this.#writeData("settings");
    }
}

export default Storage;
