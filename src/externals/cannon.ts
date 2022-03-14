import * as CANNON from "cannon";

export let cannonModule: any;
export const cannonReadyPromise = new Promise((resolve) => {
    while (!CANNON || !window);
    window.CANNON = CANNON
    cannonModule = CANNON
    resolve(CANNON)
});
