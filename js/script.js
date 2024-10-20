"use-strict;"

import { ParametricSVG } from "./parametricsvg.js";
import { evaluateEquation } from "./equations.js";

const MIN = 50;
const MAX = 500;
var WIDTH = 150;
var RATIO = 1.0;

// Because errors can be triggered on every change (plus other actions in the editor)
// it is important not to spam the user with errors
/** @type {number} */
var notificationtimeout = Date.now();
/** @type {string} */
var last_error = "";


function resize(e){
    let delta = e.deltaY > 0 ? 100 : -100;
    let mod = 1;
    if(e.ctrlKey && e.shiftKey && e.altKey){
        mod = .01;
    }else if(e.ctrlKey && e.shiftKey){
        mod = .1;
    }else if(e.ctrlKey){
        mod = .5;
    }
    WIDTH -= delta*mod;
    WIDTH = Math.floor(Math.max(Math.min(WIDTH, MAX), MIN));
    updateSize();
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function updateSize(){
    let svgele = document.querySelector("#svg>svg");
    svgele.style.width = WIDTH + "px";
    svgele.style.height =  + "px";
    let size = document.querySelector("#size");
    size.textContent = `${WIDTH}px x ${parseInt(WIDTH * RATIO)}px`;
}

{
    let vscode;

    function messageHandler(event){
        let message = event.data;
        if(message?.action !== "update") return;
        document.getElementById("save").setAttribute("disabled", true);
        let svg = message.svg;
        let stringified = JSON.stringify(svg);
        if(stringified.indexOf("script") > -1){
            console.error("PSVG Extension does not support the use of the string 'script' in JSON docs");
        }

        try{
            ParametricSVG.updateSVG(svg, document.querySelector("#svg>svg"));
        }catch(e){
            let message = ""+e;
            if(message == last_error) return;
            if(notificationtimeout && (Date.now() - notificationtimeout) < 50000) return;
            notificationtimeout = Date.now();
            last_error = message;
            console.error(e);
            // Error value seems to disappear while being posted to message, so have to coerce it here
            vscode.postMessage({action:"error", message});
            return;
        }

        last_error = "";
        notificationtimeout = 0;

        let svgele = document.querySelector("#svg>svg");
        let vbox = svgele.getAttribute("viewBox");
        if(vbox){
            let [x, y, width, height] = vbox.split(" ");
            RATIO = height/width;
            updateSize();
        }
        document.getElementById("save").removeAttribute("disabled");
    }

    function save(){
        let svg = document.body.querySelector("#svg>svg");
        svg.style.width = null;
        let message =  ParametricSVG.formatDeclaration() + svg.outerHTML;
        vscode.postMessage({action:"save", message});
        document.getElementById("save").setAttribute("disabled", true);
        updateSize();
    }

    (()=>{
        document.getElementById("svg").addEventListener("wheel", resize);
        document.getElementById("save").addEventListener("click", save);
        ParametricSVG.evaluator = evaluateEquation;
        window.addEventListener('message', messageHandler);
        vscode = acquireVsCodeApi();
        vscode.postMessage({
            action: "update"
        });
    })();

}