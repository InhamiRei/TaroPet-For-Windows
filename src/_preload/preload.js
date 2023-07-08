const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mouseAPI", {
    mouseMove: (obj) => ipcRenderer.send("mouse-move", obj),
    mouseDrapStart: (obj) => ipcRenderer.send("mouse-drap-start", obj),
    mouseDrapEnd: (obj) => ipcRenderer.send("mouse-drap-end", obj),
});

// 在 contextBridge 中暴露方法，仅允许渲染进程访问需要的接口
contextBridge.exposeInMainWorld("configAPI", {
    // 获取主进程中的数据
    getModuleData: async () => {
        return await ipcRenderer.invoke("get-module-data");
    },
});