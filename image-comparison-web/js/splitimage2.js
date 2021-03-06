var select = {
    file: getElId('fileSel'), scale: getElId('scaleSel'),
    left: getElId('leftSel'), right: getElId('rightSel'),
    subset: getElId('subsetSel'),
};

var view = {
    left: getElId('leftContainer'),
    right: getElId('rightContainer')
};

var viewOptions = {
    file: '', scale: '',
    left: '', leftQ: '',
    right: '', rightQ: '',
    subset: ''
};

var offset = {
    width: (view.right).getBoundingClientRect().width,
    height: (view.right).getBoundingClientRect().height
};
var split = {
    x: 0.5 * offset.width,
    y: 0.5 * offset.height
};
var splitTarget = {
    x: split.x,
    y: split.y
};
var splitStep = {
    x: 0,
    y: 0
};

var infoText = {
    left: getElId('leftText'),
    right: getElId('rightText'),
    center: getElId('center-head')
};

var urlFolder, urlFile;
var timer;
var textHeight = infoText.left.offsetHeight;
var first = 1;
var splitMode = 1;

var canvases = {
    left: prepCanvas(800, 800),
    right: prepCanvas(800, 800),
    leftScaled: prepCanvas(100, 100),
    rightScaled: prepCanvas(100, 100)
}
function prepCanvas(width, height, which) {
    var c;

    if (which !== undefined) {
        c = which;
        c.getContext("2d").clearRect(0, 0, c.width, c.height);
    }
    else { c = document.createElement("canvas"); }

    c.width = width;
    c.height = height;
    return c;
}

/* file|scale|codec|qual > setSide > setImage > processCanvasScale > setSize > setSplit */
select.file.onchange = function () {
    //select.scale.options[2].selected = true;
    setFile();
};

select.scale.onchange = processCanvasScale;

select.left.onchange = function () {
    setSide('left');
};
select.right.onchange = function () {
    setSide('right');
};

leftQual.onchange = function () {
    setSide('left');
};
rightQual.onchange = function () {
    setSide('right');
};

function getElId(id) {
    return document.getElementById(id);
}

function getSelValue(el, attr) {
    return el.options[el.selectedIndex].getAttribute(attr);
}

/* Get web-friendly string */
function getSlugName(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
    var to = "aaaaaeeeeeiiiiooooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

/* Uses Lanczos2 for rescaling. In-browser too blurry. Lanczos3 too slow. */
function processCanvasScale(canvas, choseSide) {
    if (choseSide) {
        // Process only one side
        scaleCanvas(canvas, choseSide);
    } else {
        // Process both sides at once
        scaleCanvas(canvases.right, 'right');
        scaleCanvas(canvases.left, 'left');
    }

    function scaleCanvas(inCanvas, side) {
        var scale = getSelValue(scaleSel, 'value');
        var outCnvs = canvases[side + 'Scaled'];

        if (scale == 1) {
            viewOptions.scale = '';
            prepCanvas(100, 100, outCnvs);
            return setSize(inCanvas, side);
        }

        var width = Math.round(inCanvas.width * scale);
        var height = Math.round(inCanvas.height * scale);

        viewOptions.scale = '*' + getSelValue(scaleSel, 'ratio');
        prepCanvas(width, height, outCnvs);

        window.pica.WW = true;
        window.pica.resizeCanvas(inCanvas, outCnvs,
            {
                quality: 2, alpha: false, unsharpAmount: 0,
                unsharpThreshold: 0, transferable: true
            },
            function () { setSize(outCnvs, side); }
        )
    }
}

function setSize(inCanvas, side) {
    var src, width, height, el;
    src = inCanvas.toDataURL();
    width = inCanvas.width;
    height = inCanvas.height;
    el = view[side];
    if (first) {
        view.left.style.height = height + "px";
        view.right.style.height = height + "px";
    } else el.style.height = height + "px";

    el.style.width = width + "px";
    var styleEl = getElId(side + "SideStyle");
    if (styleEl == null) {
        styleEl = document.createElement("style");
        styleEl.id = side + "SideStyle";
        styleEl.textContent = "#" + el.id + "{}";
        document.head.appendChild(styleEl);
    }
    styleEl.sheet.cssRules[0].style.backgroundImage = 'url(\"' + src + '\")';
    el.style.backgroundColor = "";
    el.style.opacity = 1;
    if (el == view.right) {
        offset = {
            width: width,
            height: height
        };
        if (first) {
            split.x = splitTarget.x = Math.round(width * .5);
            split.y = splitTarget.y = Math.round(height * .5);
            first = 0;
        }
    }
    switchMode();
    setSplit();
    window.location.hash = (viewOptions.file).concat(viewOptions.scale,
        '&', viewOptions.left, '=', viewOptions.leftQ,
        '&', viewOptions.right, '=', viewOptions.rightQ,
        '&', viewOptions.subset);
}

function setSplit() {
    if (!timer) {
        timer = setInterval(function () {
            splitStep.x *= .5;
            splitStep.y *= .5;
            splitStep.x += (splitTarget.x - split.x) * .1;
            splitStep.y += (splitTarget.y - split.y) * .1;

            split.x += splitStep.x;
            split.y += splitStep.y;

            if (Math.abs(split.x - splitTarget.x) < .5)
                split.x = splitTarget.x;
            if (Math.abs(split.y - splitTarget.y) < .5)
                split.y = splitTarget.y;

            view.left.style.width = Math.round(split.x) + "px";
            infoText.left.style.right = (offset.width - split.x) + "px";
            infoText.left.style.bottom = (offset.height - split.y) + "px";
            infoText.right.style.left = (split.x + 1) + "px";
            infoText.right.style.bottom = (offset.height - split.y) + "px";

            if (split.x == splitTarget.x && split.y == splitTarget.y) {
                clearInterval(timer);
                timer = null;
            }
        }, 20);
    }
}

function setImage(side, pathBase, codec, setText) {
    var canvas = canvases[side];

    if (side == 'left' || first) {
        view[side].style.backgroundColor = "#c6c6c6";
        view[side].style.backgroundImage = "";
    };
    view[side].style.opacity = 0.5;

    var path = urlFolder.concat(pathBase, '/', urlFile, '.', codec);
    var xhr = new XMLHttpRequest();

    xhr.open("GET", path, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function () {

        var blob = new Blob([xhr.response], {
            type: "image/" + codec
        });
        var blobPath = window.URL.createObjectURL(blob);

        var canvas = canvases[side];
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        var image = new Image();
        image.onload = function () {
            canvas.width = image.width;
            canvas.height = image.height;
            var area = canvas.width * canvas.height;
            setText((blob.size / 1024).toFixed(1) + " KB", (blob.size * 8 / area).toFixed(2) + " bpp");
            canvas.getContext("2d").drawImage(image, 0, 0);
            processCanvasScale(canvas, side);
            window.URL.revokeObjectURL(blobPath);
        };
        image.onerror = function () {
            var arrayData = new Uint8Array(xhr.response);

            image.src = urlFolder.concat(pathBase, '/', urlFile, '.', 'png');

        };
        image.src = blobPath;
    };
    xhr.send();
}

function setSide(side) {
    var isRight = (side == 'right') ? 1 : 0;
    var whichQual = (isRight) ? rightQual : leftQual;
    var image = getSelValue(select[side], 'value');
    var pathBase = getSelValue(select[side], 'folder');


    if (pathBase != 'Original') {
        whichQual.disabled = false;
        var quality = whichQual.options[whichQual.selectedIndex].innerHTML.toLowerCase() + '/';
    } else {
        whichQual.disabled = true;
        var quality = '';
    }

    viewOptions[side] = pathBase;
    viewOptions[side + 'Q'] = getSelValue(whichQual, 'value');
    pathBase = quality + pathBase;

    setImage(side.toLowerCase(), pathBase, image,
        function (kbytes, bpp) {
            infoText[side].innerHTML = (isRight) ? "&rarr;&nbsp;" + kbytes + "<br>&emsp;&nbsp;" + bpp : kbytes + "&nbsp;&larr;" + "<br>" + "\n" + bpp;
            textHeight = (isRight) ? textHeight : infoText[side].offsetHeight;
        });
}

function setFile() {
    urlFile = getSelValue(select.file, 'value');

    /* Flag for special processing when both left & right are both new. */
    first = 1;
    /* Any view change will update hash. */
    viewOptions.file = getSlugName(select.file.options[select.file.selectedIndex].text);

    setSide('right');
    setSide('left');
}

function moveSplit(event) {
    if (splitMode && urlFile) {
        var offset = view.right.getBoundingClientRect();
        splitTarget.x = Math.round(event.clientX - offset.left);
        splitTarget.y = Math.round(event.clientY - offset.top);
        if (splitTarget.x < 0) splitTarget.x = 0;
        if (splitTarget.y < textHeight) splitTarget.y = textHeight;
        if (splitTarget.x >= offset.width) splitTarget.x = offset.width - 1;
        if (splitTarget.y >= offset.height) splitTarget.y = offset.height - 1;
        setSplit();
    }
    return false;
}

/* Shift key to enter 'flip-view'. Repeat to flip between images. Any other key to return to split-view. */
function switchMode(keyCode) {
    if (keyCode && keyCode == "16") {
        splitMode = 0;
        var currLeft = (view.left.style.opacity > 0) ? 1 : 0; // current focus
        var switchTo = (currLeft) ? 'right' : 'left'

        infoText.center.innerHTML = getSelValue(select[switchTo], 'folder') + ' '
            + infoText[switchTo].innerHTML.replace(/&nbsp;/g, '').replace(/←|→/g, '');

        view.left.style.borderRight = "none";
        view.left.style.opacity = 1 - currLeft;
        view.left.style.width = (offset.width - 1) + "px";
    } else if (!splitMode) {
        view.left.style.borderRight = "1px dotted white";
        view.left.style.opacity = 1;
        view.left.style.width = Math.round(split.x) + "px";
        infoText.center.innerHTML = "--- vs ---";
        splitMode = 1;
    }

    infoText.left.style.opacity = splitMode;
    infoText.right.style.opacity = splitMode;
}


window.addEventListener("load",  function (event) {
    fetch("comparisonfiles.json")
        .then(response => response.json())
        .then(function (json) {
            // subset
            var subsetSel = document.getElementById("subsetSel");

            var subsetChange = function (event) {
                var hashArr, ampArr, imgOpts, name, scale, leftOpts, rightOpts, selectOpts;

                hashArr = (location.hash).split('#', 3);
                ampArr = (hashArr.pop()+'&='+'&='+'&').split('&', 4);

                imgOpts = ampArr[0].split('*', 2);
                leftOpts = ampArr[1].split('=', 2);
                rightOpts = ampArr[2].split('=', 2);
                selectOpts = ampArr[3].split('=', 2)

                if (!event) {
                    selectOpts = (selectOpts == "") ? subsetSel.value : selectOpts ;
                } else {
                    selectOpts = event.target.value;
                }

                // format
                var leftSel = document.getElementById("leftSel");
                var rightSel = document.getElementById("rightSel");
                while (leftSel.firstChild) {
                    leftSel.removeChild(leftSel.firstChild);
                }
                while (rightSel.firstChild) {
                    rightSel.removeChild(rightSel.firstChild);
                }
                for (format of json["comparisonfiles"][selectOpts]["format"]) {
                    var optLeft = document.createElement("option");
                    var optRight = document.createElement("option");

                    optLeft.setAttribute("folder", format["name"]);
                    optLeft.text = format["name"];
                    optLeft.value = format["extension"];
                    leftSel.add(optLeft, null);

                    optRight.setAttribute("folder", format["name"]);
                    optRight.text = format["name"];
                    optRight.value = format["extension"];
                    rightSel.add(optRight, null);
                }
                // files
                var fileSel = document.getElementById("fileSel");
                while (fileSel.firstChild) {
                    fileSel.removeChild(fileSel.firstChild);
                }
                var filesList = json["comparisonfiles"][selectOpts]["files"]
                filesList.sort(function(a,b) {
                    if ( a.title < b.title )
                        return -1;
                    if ( a.title > b.title )
                        return 1;
                    return 0;
                })
                for (file of filesList) {
                    var opt = document.createElement("option");
                    opt.value = file["filename"];
                    opt.text = file["title"];
                    fileSel.add(opt, null);
                }
                urlFolder = "comparisonfiles/" + getSelValue(select.subset, 'value') + "/";

                viewOptions.subset = selectOpts;
                select.subset.value = selectOpts;

                for (var opt, j = 0; opt = select.file.options[j]; j++) {
                    if (getSlugName(opt.text) == imgOpts[0]) {
                        select.file.selectedIndex = j;
                        var z, s, q;

                        if (imgOpts[1]) {
                            var z = document.querySelector('#scaleSel [ratio="' + imgOpts[1] + '"]');
                            if (z) {z.selected = true};
                        }


                        if (leftOpts) {
                            s = document.querySelector('#leftSel [folder="' + leftOpts[0] + '"]');
                            if (s) {s.selected = true};
                            q = document.querySelector('#leftQual [value="' + leftOpts[1] + '"]');
                            if (q) {q.selected = true};
                        }
                        if (rightOpts) {
                            s = document.querySelector('#rightSel [folder="' + rightOpts[0] + '"]');
                            if (s) {s.selected = true};
                            q = document.querySelector('#rightQual [value="' + rightOpts[1] + '"]');
                            if (q) {q.selected = true};
                        }
                        break;
                    }
                };

                setFile();
            }

            subsetSel.onchange = subsetChange;

            for (subset in json['comparisonfiles']) {
                var opt = document.createElement("option");
                opt.value = subset;
                opt.text = subset;
                subsetSel.add(opt, null);

            }
            subsetChange();
            urlFolder = "comparisonfiles/" + getSelValue(select.subset, 'value') + "/";
            setFile();
        });
});
window.addEventListener("keydown", function (event) {
    switchMode(event.keyCode);
}, false);

view.right.addEventListener("mousemove", moveSplit, false);
view.right.addEventListener("click", moveSplit, false);

infoText.right.style.backgroundColor = "rgba(0,0,0,.3)";
infoText.left.style.backgroundColor = "rgba(0,0,0,.3)";
