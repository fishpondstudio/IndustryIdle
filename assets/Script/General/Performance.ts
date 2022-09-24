import { AYService } from "./AYService";

const DRAW_CALL_THRESHOLD = 50;

if (CC_DEBUG && !CC_EDITOR) {
    setInterval(checkPerformance, 1000);
}

function checkPerformance() {
    if (cc.renderer.drawCalls > DRAW_CALL_THRESHOLD) {
        cc.log(
            `%cDraw Call  = ${cc.renderer.drawCalls}, which exceeds threshold (${DRAW_CALL_THRESHOLD})`,
            "color:red"
        );
    }
}

if (CC_BUILD) {
    const _ccError = cc.error;
    cc.error = (...args: any[]) => {
        AYService.trackError(args.join(" "));
        _ccError(args);
    };
}
