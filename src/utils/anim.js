// 通过颜色来判断是否在本体区域
export const body_area_func = (color, pos) => {
    const { rgba } = color;
    const canvas = document.getElementById("taro-canvas");
    if (rgba === "rgba(0,0,0,0)") {
        canvas.style.cursor = "default";
        window.mouseAPI.mouseMove({
            x: pos.x,
            y: pos.y,
            ignore: true,
        });
        return false;
    } else {
        canvas.style.cursor = "pointer";
        window.mouseAPI.mouseMove({
            x: pos.x,
            y: pos.y,
            ignore: false,
        });
        return true;
    }
};

// 给canvas一个原型方法，构建虚拟canvas用来获取canvas上某个点的颜色
// 传入三个参数，点击的x坐标和y坐标，img对象
export const get_pixel_color_func = (x, y, img) => {
    // 虚拟canvas
    const shadow_canvas = document.getElementById("shadow-canvas");
    // 通过canvas自带的方法获取上下文
    const context = shadow_canvas.getContext("2d");
    // 先清除画布
    context.clearRect(0, 0, shadow_canvas.width, shadow_canvas.height);
    // 绘制传入的图片，这个图片就是动画的某一帧
    context.drawImage(img, 0, 0);
    // 警告warning：Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.
    // 获取该点像素数据
    const image_pixel_data = context.getImageData(x, y, 1, 1);
    let pixel = image_pixel_data.data;
    // 返回rgba颜色值
    let r = pixel[0];
    let g = pixel[1];
    let b = pixel[2];
    let a = pixel[3] / 255;
    a = Math.round(a * 100) / 100;
    let rHex = r.toString(16);
    r < 16 && (rHex = "0" + rHex);
    let gHex = g.toString(16);
    g < 16 && (gHex = "0" + gHex);
    let bHex = b.toString(16);
    b < 16 && (bHex = "0" + bHex);
    const rgbaColor = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    const rgbColor = "rgb(" + r + "," + g + "," + b + ")";
    const hexColor = "#" + rHex + gHex + bHex;

    return {
        rgba: rgbaColor,
        rgb: rgbColor,
        hex: hexColor,
        r: r,
        g: g,
        b: b,
        a: a,
    };
};