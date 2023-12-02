export const methods: { [key: string]: (...any: any) => any } = {
    createBlockData: () => {
        Editor.Message.request('scene', 'execute-scene-script', {
            name: 'BlockDataCreator',
            method: 'createBlockData',
            args: [],
        });
    },
};

/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
export function load() {}

/**
 * @en Hooks triggered after extension uninstallation is complete
 * @zh 扩展卸载完成后触发的钩子
 */
export function unload() {}
