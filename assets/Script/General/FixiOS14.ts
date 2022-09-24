// @ts-nocheck

cc.game.on(cc.game.EVENT_ENGINE_INITED, () => {
    // Patch to fix iOS 14 performance issue
    // ref. https://github.com/cocos-creator/engine/tree/v2.4.5/cocos2d/core/renderer/webgl/mesh-buffer.js
    const FIX_IOS14_BUFFER =
        (cc.sys.os === cc.sys.OS_IOS || cc.sys.os === cc.sys.OS_OSX) &&
        cc.sys.isBrowser &&
        /(OS 1[4-9])|(Version\/1[4-9])/.test(window.navigator.userAgent);

    if (FIX_IOS14_BUFFER) {
        cc.MeshBuffer.prototype.checkAndSwitchBuffer = function checkAndSwitchBuffer(vertexCount) {
            if (this.vertexOffset + vertexCount > 65535) {
                this.uploadData();
                this._batcher._flush();
            }
        };
        cc.MeshBuffer.prototype.forwardIndiceStartToOffset = function forwardIndiceStartToOffset() {
            this.uploadData();
            this.switchBuffer();
        };
    }
});
