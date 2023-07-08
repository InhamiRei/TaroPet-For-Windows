const { app, screen, ipcMain, Menu, Tray, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
// 主窗口
let mainWindow = null;
// 拖拽的初始位置
let drapPosition = { x: 0, y: 0 };
// 拖拽定时器
let drapTimer = null;

// electron-store本地化存储
const Store = require("electron-store");
let option = {
    name: "taro_pet_config", //文件名称,默认 config
    // encryptionKey: "aes-256-cbc", //对配置文件进行加密
};
const store = new Store(option);
// console.log(store.path);

// 初始化模组
if (store.has("module") === false) {
    const attribute = {
        hunger: 100, // 饥饿值
        mood: 100, // 心情值
        clean: 100, // 清洁值
        health: 100, // 健康值
        die: false, // 是否死亡
        aggressivity: 1, // 攻击力
        defensive: 1, // 防御力
        technique: 1, // 技能值
        intelligence: 1, // 智力值
        agility: 1, // 敏捷值
        lucky: 1, // 幸运值
        level: 1, // 等级
        exp: 0, // 经验值
        limitExp: 100, // 升级经验值
    };
    store.set("module.kkr", JSON.stringify(attribute));
    store.set("module.kru", JSON.stringify(attribute));
    store.set("module.pko", JSON.stringify(attribute));
    store.set("mana", 1000);
}

// 用来获取上一次使用的模组
const setModuleName = () => {
    if (store.has("last_module") === false) {
        // 默认可可萝模组
        getModuleData("kkr");
    } else {
        getModuleData(store.get("last_module"));
    }
};

// 获取模组数据并监听
const getModuleData = (name) => {
    // 存储当前模组
    store.set("last_module", name);
    // 先移除
    ipcMain.removeHandler("get-module-data");
    // 主进程监听渲染进程发送的请求，返回相应数据
    ipcMain.handle("get-module-data", () => {
        return {
            name: name,
            mana: store.get("mana"),
            attribute: store.get(`module.${name}`),
        };
    });
};

const createMainWindow = () => {
    // 获取当前桌面的宽度和高度
    const size = screen.getPrimaryDisplay().workAreaSize;
    const { width, height } = size;

    mainWindow = new BrowserWindow({
        width: 390,
        height: 390,
        // 起始位置是屏幕宽度减去窗口宽度，再减去10个像素
        x: width - 390 - 10,
        y: height - 390 - 10,
        // 隐藏菜单栏
        autoHideMenuBar: true,
        // 设置为透明窗口
        transparent: true,
        // 隐藏窗口边框
        frame: false,
        // 窗口置顶
        alwaysOnTop: true,
        // 隐藏任务栏图标
        skipTaskbar: true,
        // 禁止改变窗口大小
        resizable: false,
        // 先隐藏窗口
        show: false,
        // Preload 脚本
        webPreferences: {
            preload: path.resolve(__dirname, "../_preload/preload.js"),
        },
    });

    // 允许鼠标穿透
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

    // 开启调试工具
    // mainWindow.webContents.openDevTools();

    mainWindow.loadFile(path.resolve(__dirname, "../index.html"));

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });
};

// 系统托盘方法
const createTray = () => {
    const icon = nativeImage.createFromPath(path.resolve(__dirname, "../public/icon/icon@16.png"));
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: "TaroPet v1.0", type: "normal", enabled: false, icon: icon },
        { type: "separator" },
        {
            label: "可可萝",
            type: "normal",
            icon: nativeImage.createFromPath(path.resolve(__dirname, "../public/icon/kkr.png")),
            click: () => {
                getModuleData("kkr");
                mainWindow.reload();
            },
        },
        {
            label: "凯露",
            type: "normal",
            icon: nativeImage.createFromPath(path.resolve(__dirname, "../public/icon/kru.png")),
            click: () => {
                getModuleData("kru");
                mainWindow.reload();
            },
        },
        {
            label: "佩可莉姆",
            type: "normal",
            icon: nativeImage.createFromPath(path.resolve(__dirname, "../public/icon/pko.png")),
            click: () => {
                getModuleData("pko");
                mainWindow.reload();
            },
        },
        { type: "separator" },
        {
            label: "重新加载",
            type: "normal",
            click: () => {
                mainWindow.reload();
            },
        },
        {
            label: "退出",
            type: "normal",
            click: () => {
                tray.destroy(); // 销毁托盘
                app.quit(); // 退出应用程序
            },
        },
    ]);

    tray.setToolTip("TaroPet v1.0");
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(async () => {
    await setModuleName();
    createMainWindow();
    createTray();
});

// 鼠标移动监听，用于判断是否需要穿透
ipcMain.on("mouse-move", (event, obj) => {
    if (obj.ignore) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
        mainWindow.setIgnoreMouseEvents(false);
    }
});

// 桌宠拖动开始，记录点击位置，让窗口粘着鼠标
ipcMain.on("mouse-drap-start", (event, obj) => {
    drapPosition = {
        x: obj.x,
        y: obj.y,
    };
    drapTimer = setInterval(() => {
        const { x, y } = screen.getCursorScreenPoint();
        mainWindow.setPosition(x - drapPosition.x, y - drapPosition.y);
    }, 10);
});

// 桌宠拖动结束，也就是再按一下右键，定时器清空
ipcMain.on("mouse-drap-end", (event, obj) => {
    clearInterval(drapTimer);
});
