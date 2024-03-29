var config = {
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          var current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "780px";
              document.documentElement.style.height = "550px";
            }
            /*  */
            chrome.runtime.connect({"name": config.port.name});
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "load": function () {
    var reload = document.getElementById("reload");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    var rows = document.querySelector("input[name='rows']");
    var columns = document.querySelector("input[name='columns']");
    var startstop = document.querySelector("input[name='startstop']");
    /*  */
    support.addEventListener("click", function (e) {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function (e) {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    rows.addEventListener("change", function (e) {
      config.storage.write("rows", e.target.value > 1 ? e.target.value : 3);
      if (config.game.reload.timeout) window.clearTimeout(config.game.reload.timeout);
      config.game.reload.timeout = window.setTimeout(config.game.reload.interface, 300);
    });
    /*  */
    columns.addEventListener("change", function (e) {
      config.storage.write("columns", e.target.value > 1 ? e.target.value : 3);
      if (config.game.reload.timeout) window.clearTimeout(config.game.reload.timeout);
      config.game.reload.timeout = window.setTimeout(config.game.reload.interface, 300);
    });
    /*  */
    config.storage.load(config.app.start);
    startstop.addEventListener("click", config.game.start);
    window.removeEventListener("load", config.load, false);
    reload.addEventListener("click", function () {document.location.reload()});
  },
  "app": {
    "start": function () {
      var count = 0;
      var table = document.getElementById("dots");
      var rows = document.querySelector("input[name='rows']");
      var best = document.querySelector("input[name='best']");
      var columns = document.querySelector("input[name='columns']");
      var context = document.documentElement.getAttribute("context");
      /*  */
      var n = context === "webapp" ? 6 : 10;
      rows.value = config.storage.read("rows") !== undefined ? config.storage.read("rows") : 6;
      best.value = config.storage.read("best") !== undefined ? config.storage.read("best") : 0;
      columns.value = config.storage.read("columns") !== undefined ? config.storage.read("columns") : n;
      /*  */
      config.game.grid.size = rows.value * columns.value;
      config.game.log("App is ready");
      table.textContent = '';
      /*  */
      for (var i = 0; i < rows.value; i++) {
        var tr = document.createElement("tr");
         /*  */
        for (var j = 0; j < columns.value; j++) {
          var td = document.createElement("td");
          var input = document.createElement("input");
           /*  */
          td.setAttribute("align", "center");
          td.setAttribute("valign", "center");
          input.setAttribute("type", "button");
          input.setAttribute("action", count + '');
          input.addEventListener("click", function (e) {
            var action = e.target.getAttribute("action");
            if (action) {
              config.game.dot.move(parseInt(action));
            }
          });
          /*  */
          td.appendChild(input);
          tr.appendChild(td);
          count++;
        }
        /*  */
        table.appendChild(tr);
      }
    }
  },
  "game": {
    "timer": null,
    "duration": 30,
    "grid": {"size": null},
    "total": {"hits": null},
    "log": function (e) {
      document.cpanel.state.value = e;
    },
    "is": {
      "playing": false,
      "launched": false
    },
    "reset": {
      "grid": function () {
        for (var k = 0; k < document.dmz.elements.length; k++) {
          document.dmz.elements[k].removeAttribute("checked");
        }
      }
    },
    "reload": {
      "timeout": null,
      "interface": function () {
        config.game.stop(false);
        config.game.timer.stop();
        config.storage.load(config.app.start);
      }
    },
    "start": function () {
      config.game.timer.stop();
      if (config.game.is.playing) {
        return config.game.stop(false);
      }
      /*  */
      config.game.reset.grid();
      config.game.total.hits = 0;
      config.game.is.playing = true;
      config.game.log("Playing...");
      document.cpanel.score.value = config.game.total.hits;
      /*  */
      config.game.timer.start(config.game.duration);
      config.game.dot.mark();
    },
    "stop": function (flag) {
      var score = document.querySelector("input[name='score']");
      var timeleft = document.querySelector("input[name='timeleft']");
      var startstop = document.querySelector("input[name='startstop']");
      /*  */
      config.game.reset.grid();
      config.game.timer.stop();
      startstop.value = "Start";
      config.game.log("Game over!");
      config.game.is.playing = false;
      document.cpanel.timeleft.value = 0;
      /*  */
      if (flag) window.alert("Game over!\nYour score is: " + config.game.total.hits);
      if (config.game.total.hits > 0) {
        var best = config.storage.read("best");
        /*  */
        var cond_1 = !best;
        var cond_2 = best && config.game.total.hits > best;
        if (cond_1 || cond_2) {
          config.storage.write("best", config.game.total.hits);
          document.querySelector("input[name='best']").value = config.game.total.hits;
        }
      }
    },
    "timer": {
      "value": 0,
      "timeout": null,
      "stop": function () {
        if (config.game.is.playing) {
          if (config.game.timer.timeout) {
            window.clearTimeout(config.game.timer.timeout);
          }
        }
      },      
      "start": function (t) {
        var score = document.querySelector("input[name='score']");
        var timeleft = document.querySelector("input[name='timeleft']");
        var startstop = document.querySelector("input[name='startstop']");
        /*  */
        timeleft.value = t;
        startstop.value = "Stop";
        document.cpanel.timeleft.value = t;
        score.value = document.cpanel.score.value;
        /*  */
        if (config.game.is.playing) {
          if (t === 0) {
            return config.game.stop(true);
          } else {
            config.game.timer.value = t - 1;
            if (config.game.timer.timeout) window.clearTimeout(config.game.timer.timeout);
            config.game.timer.timeout = window.setTimeout(function () {
              config.game.timer.start(config.game.timer.value);
            }, 1000);
          }
        }
      }
    },
    "dot": {
      "position": -1,
      "error": function (loc) {
        document.dmz.elements[loc].setAttribute("error", '');
        window.setTimeout(function () {
          document.dmz.elements[loc].removeAttribute("error");
        }, 100);
      },
      "mark": function () {
        if (!config.game.grid.size) return;
        /*  */
        for (var i = 0; i < 100; i++) {
          var rand = Math.floor((i + 1) / 1000 + Math.random() * 100 % config.game.grid.size);
          if (rand !== config.game.dot.position) {
            var target = document.dmz.elements[rand];
            if (target) {
              target.setAttribute("checked", '');
              config.game.dot.position = rand;
              break;
            }
          }
        }
      },
      "move": function (loc) {
        if (config.game.is.playing === false) {
          config.game.log("Press start to play");
          return config.game.reset.grid();
        }
        /*  */
        if (config.game.dot.position !== loc) {
          config.game.total.hits += -1;
          document.cpanel.score.value = config.game.total.hits;
          document.dmz.elements[loc].removeAttribute("error");
          document.dmz.elements[loc].removeAttribute("checked");
          /*  */
          config.game.dot.error(loc);
        } else {
          config.game.total.hits += 1;
          document.cpanel.score.value = config.game.total.hits;
          document.dmz.elements[loc].removeAttribute("error");
          document.dmz.elements[loc].removeAttribute("checked");
          /*  */
          config.game.dot.mark();
        }
      }
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);