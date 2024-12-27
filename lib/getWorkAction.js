function getWorkAction() {
    let action = window.location.hash;
    if (action && action !== "#home") {
        action = action.slice(1)
        action = "get" + action[0].toUpperCase() + action.slice(1)
    } else {
        if(action==="#home"){
            action = "getSummary"
        } else
        action = null
    }
    return action
}

if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.getWorkAction = getWorkAction
    } else
        globalThis._sharedLogic = { getWorkAction };
}