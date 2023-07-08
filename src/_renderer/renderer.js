// 导入方法
import { get_pixel_color_func, body_area_func } from "../utils/anim.js";
// 当前使用的模型
let current_module = null;
// 初始配置和动作配置
let init_config = null;
let action_config = null;
let voice_config = null;
// 当前的动画
let anim_current = null;
// 初始动画
let anim_normal = null;
// 拖拽动画
let anim_drap = null;
// 存储的随机动作索引，用来给定时器随机
let anim_action_random_index = [];
let anim_action_random_cache = [];
// 动画的定时器
let timer = null;
// 拖拽状态
let drag_static = false;
// 语音状态
let talk_static = false;
// 动画的舞台
let app = null;
// 音频的dom
let audio_dom = null;
// 词板的dom
let dialog_dom = null;
// 动画的canvas
let anim_canvas = null;
// 虚拟的canvas
let shadow_canvas = null;
// 获取窗口的大小
const bower_width = window.innerWidth;
const bower_height = window.innerHeight;

// 页面加载完成执行
window.addEventListener("load", async (event) => {
    // 在渲染进程中获取数据
    const config_data = await window.configAPI.getModuleData();
    current_module = config_data.name;
    // console.log('当前桌宠：', current_module)
    // console.log('当前桌宠的状态属性：', JSON.parse(config_data.attribute))
    // console.log('当前桌宠的玛娜：', config_data.mana)

    // 获取配置
    const module = await import(`../modules/${current_module}/${current_module}.js`);
    init_config = module.init_config;
    action_config = module.action_config;
    voice_config = module.voice_config;

    // 赋值canvas
    anim_canvas = document.getElementById("taro-canvas");
    shadow_canvas = document.getElementById("shadow-canvas");
    shadow_canvas.width = bower_width;
    shadow_canvas.height = bower_height;

    // 赋值音频dom，词板dom
    audio_dom = document.getElementById("taro-pet-audio");
    dialog_dom = document.getElementById("taro-pet-dialog");

    // 动画舞台配置
    app = new PIXI.Application({
        view: anim_canvas,
        width: bower_width,
        height: bower_height,
        backgroundAlpha: 0,
        resolution: 1,
    });
    // 添加给div-taropet元素
    document.getElementById("taro-pet").appendChild(app.view);


    // 先把初始的动画加载完成
    anim_normal = await create_anim_func(init_config[0], 0);
    anim_normal.play();
    app.stage.addChild(anim_normal);
    // 赋值给当前动画
    anim_current = anim_normal;

    // 开始初始化其他的动画
    anim_drap = await create_anim_func(init_config.find((obj) => obj.name === "drap"), 0);

    // 将动作的配置转换成随机索引赋值 [0,1,2,3,4]
    anim_action_random_index = Array.from(
        action_config.map((obj, index) => {
            obj.index = index;
            return obj;
        }),
        ({ index }) => index
    );

    // 开启定时器
    setIntervalTimer();
});

// 创建动画的方法 obj-配置对象, type-是否初始化0/1
const create_anim_func = async (obj, type) => {
    // 存放文件前缀, 文件格式(png,jpg)
    const file_prefix = "./modules";
    const file_format = ".png";
    const { name, frames, object } = obj;
    const texture_array = [];
    // 通过帧数循环获取贴图
    for (let i = 0; i < frames; i++) {
        const num = `000${i}`.slice(-3);
        // texture_name ./modules/kkr/normal/001.png
        const texture_name = type === 0 ? `${file_prefix}/${current_module}/${name}/${num}${file_format}` : `${file_prefix}/${current_module}/action/${name}/${num}${file_format}`;
        const texture = await PIXI.Texture.from(texture_name);
        texture_array.push(texture);
    }
    // 生成动画，配置动画属性
    const anim = new PIXI.AnimatedSprite(texture_array);
    anim.name = name;
    anim.animationSpeed = 0.5;
    anim.loop = object.loop;

    // 设置交互模式
    anim.eventMode = "dynamic";

    // 鼠标移动事件
    anim.on("mousemove", (event) => {
        const global_position = event.data.global;
        const local_position = anim.toLocal(global_position);
        // 当前这一帧的动画贴图
        const anim_img = anim.texture.baseTexture.resource.source;

        if (drag_static) {
            // 这个时候在拖拽，什么都不做
        } else {
            body_area_func(get_pixel_color_func(local_position.x, local_position.y, anim_img), local_position)
        }
    });

    // 左键点击播放语音
    anim.on("click", (event) => {
        if (drag_static === false && talk_static === false) {
            talk_static = true;
            // 随机获取音频的index
            const index = Math.floor(Math.random() * voice_config.length);
            const voice_data = voice_config[index];
            // 设置音频文件的 URL
            audio_dom.src = `${file_prefix}/${current_module}/voice/${voice_data.voice}`;
            // 设置词板
            dialog_dom.style.color = voice_data.color;
            // 这里必须要一同设置repeat和size等，不然背景图会变形
            dialog_dom.style.background = `url("./public/images/${voice_data.dialog}") no-repeat center / 100% 100%`;
            dialog_dom.style.opacity = 1;
            dialog_dom.innerHTML = voice_data.element;
            const onAudioEnded = () => {
                talk_static = false;
                dialog_dom.style.opacity = 0;
                // 移除事件监听器
                audio_dom.removeEventListener("ended", onAudioEnded);
            };
            audio_dom.addEventListener("ended", onAudioEnded);
            audio_dom.play();
        }
    });

    // 鼠标点击右键拖拽
    anim.on("rightclick", (event) => {
        const global_position = event.data.global;
        const local_position = anim.toLocal(global_position);
        if (drag_static === false) {
            // 如果没在拖拽状态，右键后进入推拽状态，传给主进程点击的位置
            window.mouseAPI.mouseDrapStart({
                x: local_position.x,
                y: local_position.y,
                drap: true,
            });
            // 开启拖拽状态进入拖拽动画
            drag_static = true;
            change_anim_func(anim_current, anim_drap, 0);
        } else {
            // 再次点击脱离拖拽状态
            window.mouseAPI.mouseDrapEnd({
                drap: false,
            });
            // 取消拖拽状态进入普通动画
            drag_static = false;
            change_anim_func(anim_drap, anim_normal, 0);
        }
    });

    if (object.loop === false) {
        anim.onComplete = () => {
            // 完成动作后500毫秒后进入普通动画
            change_anim_func(anim, anim_normal, object?.endTime ?? 100);
        };
    }

    if (type === 1) {
        // 缓存随机动作，这样下次不需要再次生成
        anim_action_random_cache.push(anim);
        // 给生成动画时间
        setTimeout(() => {
            // 生成动画后1秒后进入动作动画
            if (drag_static === false) {
                change_anim_func(anim_normal, anim, 0);
            }
        }, 1000);
    } else {
        // 如果是初始动画的话就返回动画
        return anim;
    }
};

// 进入动画，可以用来切换动画（切换回normal或进入drap）
const change_anim_func = (from_anim, to_anim, time) => {
    from_anim.stop();
    setTimeout(() => {
        app.stage.removeChild(from_anim);
        to_anim.gotoAndPlay(0);
        app.stage.addChild(to_anim);
        // 替换当前动画
        anim_current = to_anim;
    }, time);
};

// 设置定时器，用来一定时间播放一次随机动作
const setIntervalTimer = () => {
    timer = setInterval(() => {
        if (drag_static === false && talk_static === false) {
            // 随机获取动作的index
            const index = Math.floor(Math.random() * anim_action_random_index.length);
            // 通过index获取动作的配置
            const action = action_config[anim_action_random_index[index]];
            // 如果有缓存的动作就不需要生成了
            const cacheAction = anim_action_random_cache.find((obj) => obj.name === action.name);

            if (cacheAction) {
                change_anim_func(anim_normal, cacheAction, 0);
            } else {
                create_anim_func(action, 1);
            }
        } else {
            // 说明是在拖拽，什么都不做
        }
    }, 1000 * 60 * 5);
};