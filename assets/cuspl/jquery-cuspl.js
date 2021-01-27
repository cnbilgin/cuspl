/* cnbilgin 
   https://github.com/cnbilgin/cuspl
*/
(function ($) {
   $.cuspl = function (element, options) {
      let defaults = {
         id: "cuspl-" + Date.now() + "-" + Math.round(Math.random() * 1000),
         poster: null,
         watermark: null,
         skipIntro: null,
         continueLastPosition: null,
         playbackRates: {
            defaultValue: 1,
            options: [
               { value: 2, label: "2x" },
               { value: 1.75, label: "1.75x" },
               { value: 1.5, label: "1.5x" },
               { value: 1.25, label: "1.25x" },
               { value: 1, label: "1x" },
               { value: 0.75, label: "0.75x" },
               { value: 0.5, label: "0.5x" },
            ],
         },
         source: null,
         defaultVideoType: null,
         fastSeek: true,
         size: {
            width: "100%",
            height: "100%",
         },
         aspectRatio: null,
         customScreens: null,
         fastBackwardValue: 10,
         fastForwardValue: 10,
         previousButton: null,
         nextButton: null,
      };

      let plugin = this;
      plugin.settings = {};

      let $element = $(element);

      /* store - start */
      const store = {
         globalKey: "cusplv1-data-global",
         key: "cusplv1-data",
         globalVersion: 1.01,
         version: 1.01,
         initializeMainStore: function () {
            const globalDefault = { version: this.globalVersion };
            let globalStore = localStorage.getItem(this.globalKey);
            if (globalStore == null) {
               localStorage.setItem(
                  this.globalKey,
                  JSON.stringify(globalDefault)
               );
            }

            const defaultStore = { version: this.version, players: {} };
            let store = localStorage.getItem(this.key);
            if (store == null) {
               localStorage.setItem(this.key, JSON.stringify(defaultStore));
            }
         },
         save: function (dataKey, value) {
            let store = localStorage.getItem(this.key);
            store = JSON.parse(store);

            let playersStore = store.players[plugin.settings.id];

            let data = playersStore ? playersStore : {};
            if (typeof dataKey === "string" && value != null)
               data[dataKey] = value;
            else data = dataKey;

            playersStore = data;
            store.players[plugin.settings.id] = playersStore;

            localStorage.setItem(this.key, JSON.stringify(store));
         },
         get: function () {
            let store = localStorage.getItem(this.key);
            store = JSON.parse(store);

            let playersStore = store.players[plugin.settings.id];

            if (playersStore) return playersStore;
            else return {};
         },
         saveGlobal: function (key, value) {
            let store = localStorage.getItem(this.globalKey);
            store = JSON.parse(store);

            store[key] = value;
            localStorage.setItem(this.globalKey, JSON.stringify(store));
         },
         getGlobal: function (key = undefined) {
            let store = localStorage.getItem(this.globalKey);
            store = JSON.parse(store);

            if (key) return store[key];

            return store;
         },
      };
      /* store - end */

      //TODO Events should be divided into system events and user events
      const baseArgumentsCreator = (argumentsCreator) => {
         let base = {
            plugin: plugin,
         };

         $.extend(base, argumentsCreator());

         return base;
      };
      const activeEventList = {};
      const events = [
         {
            name: "OnTimeUpdate",
            argumentsCreator: () => ({
               currentTime: plugin.getCurrentTime(),
               remainingTime: plugin.getRemainingTime(),
               totalTime: plugin.getDuration(),
            }),
         },
         {
            name: "OnTimeUpdateSecond",
            argumentsCreator: () => ({
               currentTime: plugin.getCurrentTime(),
               remainingTime: plugin.getRemainingTime(),
               totalTime: plugin.getDuration(),
            }),
         },
         {
            name: "OnPlay",
            argumentsCreator: () => {},
         },
         {
            name: "OnPause",
            argumentsCreator: () => {},
         },
         {
            name: "OnReady",
            argumentsCreator: () => {},
         },
         {
            name: "OnEnded",
            argumentsCreator: () => {},
         },
         {
            name: "OnVolumeChange",
            argumentsCreator: () => ({
               volume: plugin.volume(),
            }),
         },
         {
            name: "OnPlaybackRateChange",
            argumentsCreator: () => ({
               currentRate: plugin.getPlaybackRate(),
               rates: plugin.settings.playbackRates.options,
            }),
         },
         {
            name: "OnUserActive",
            argumentsCreator: () => {},
         },
         {
            name: "OnUserInactive",
            argumentsCreator: () => {},
         },
         {
            name: "OnPlayerResize",
            argumentsCreator: () => {},
         },
         {
            name: "OnKeyDown",
            argumentsCreator: () => {},
         },
         {
            name: "OnFullscreenChanged",
            argumentsCreator: () => ({
               fullscreen: plugin.isFullscreen(),
            }),
         },
      ];
      const triggerEvent = (eventName, args = null) => {
         let pluginEventConfig = events.find((p) => p.name === eventName);
         if (!pluginEventConfig) throw new Error("Unknown event");

         const activeEvents = activeEventList[eventName];

         if (!activeEvents) return;

         const activeEventsForLoop = [...activeEvents];

         activeEventsForLoop.forEach((eventData) => {
            let definedArgs = eventData.argumentsCreator();
            if (args !== null) definedArgs = { ...definedArgs, ...args };
            eventData.fn(definedArgs);
         });
      };

      //plugin event triggers
      $element.on("keydown", (e) => {
         triggerEvent("OnKeyDown", { key: e.key, keyCode: e.keyCode });
         return false;
      });
      /* events helper methods - start */
      plugin.on = function (eventName, eventFn, executeOnce = false) {
         let pluginEventConfig = events.find((p) => p.name === eventName);
         if (!pluginEventConfig) throw new Error("Unknown event");

         let argumentsCreator = () => {
            return baseArgumentsCreator(pluginEventConfig.argumentsCreator);
         };

         let eventData = { name: eventName, fn: eventFn, argumentsCreator };

         if (executeOnce) {
            eventData.fn = function (e) {
               eventFn(e);
               plugin.off(eventName, arguments.callee);
            };
         }

         let eventList = activeEventList[eventName];

         if (eventList) eventList.push(eventData);
         else eventList = [eventData];

         activeEventList[eventName] = eventList;
      };

      plugin.one = function (eventName, eventFn) {
         plugin.on(eventName, eventFn, true);
      };

      plugin.off = function (eventName, eventFn) {
         let pluginEventConfig = events.find((p) => p.name === eventName);
         if (!pluginEventConfig) throw new Error("Unknown event");

         let eventList = activeEventList[eventName];
         if (!eventList)
            throw new Error("Attempted to delete non-existent event");

         if (eventFn) {
            let eventIndex = eventList.findIndex(
               (item) => item.fn === eventFn && item.name === eventName
            );

            if (eventIndex === -1)
               throw new Error("Attempted to delete non-existent event");

            eventList.splice(eventIndex, 1);
         } else eventFn = [];

         activeEventList[eventName] = eventList;
      };

      plugin.trigger = function (eventName, eventArgs) {
         triggerEvent(eventName, eventArgs);
      };
      /* events helper methods - end */

      const _getPlayerData = () => {
         return {
            playerId: plugin.settings.playerId,
            $player: plugin.settings.$player,
            $element: $element,
            element: element,
            plugin: plugin,
            settings: plugin.settings,
            store: store,
            playerViewPanel: null,
         };
      };

      const Player = cusplVideoJsPlayer({
         eventTrigger: triggerEvent,
         getPlayerData: _getPlayerData,
      });

      /* private functions - start */
      let initializeAddClassEvents = () => {
         plugin.one("OnPlay", function () {
            $element.addClass("cuspl-played-once");
         });

         plugin.on("OnFullscreenChanged", function (e) {
            const className = "cuspl-fullscreen";
            if (e.fullscreen) $element.addClass(className);
            else $element.removeClass(className);
         });
      };
      let initializePlayer = () => {
         plugin.settings.playerId = plugin.settings.id + "-player";
         plugin.settings.$player = $(
            '<div class="cuspl-player" id="' +
               plugin.settings.playerId +
               '"></div>'
         );

         $element.append(plugin.settings.$player);
         plugin.settings.playerRef = Player.initialize(_getPlayerData);

         //TODO: auto initialize plugins
         watermark.init(plugin.settings.watermark);
         playbackRates.init(plugin.settings.playbackRates);
         alternativeSelector.init(plugin.settings.source);
         skipIntro.init(plugin.settings.skipIntro);
         customScreens.init(plugin.settings.customScreens);
         fastMediaButtons.init(plugin.settings);
         keyboardShortcuts.init();

         applyPreferences();
         initializeSaveVolume();
         initializeSaveVideoPosition();
         initializeSavePlaybackRate();
         applyBlurOnButtonClick();

         initializeAddClassEvents();
      };

      let applyBlurOnButtonClick = () => {
         $element.on("mouseup", "button", function () {
            $(this).blur();
            Player.getViewPanel().focus();
         });
      };

      let applyPreferences = () => {
         /* global preferences */
         const globalPreferences = store.getGlobal();

         const lastVolume = globalPreferences.volume;
         if (lastVolume != null) plugin.volume(lastVolume);

         const muted = globalPreferences.muted;
         if (muted != null) {
            if (muted) plugin.mute();
            else plugin.unmute();
         }

         const lastPlaybackRate = globalPreferences.playbackRate;
         if (lastPlaybackRate != null) plugin.playbackRate(lastPlaybackRate);
         /* player preferences */
         const playerPreferences = store.get();
         if (playerPreferences.lastPosition != null)
            plugin.seek(playerPreferences.lastPosition);
      };

      let fixSettings = (options) => {
         if (options.source) {
            if (typeof options.source === "string") {
               options.source = [
                  {
                     src: options.source,
                     label: null,
                     type: options.defaultVideoType,
                  },
               ];
            } else {
               options.source = options.source.map((s) =>
                  $.extend(
                     { src: null, label: null, type: options.defaultVideoType },
                     s
                  )
               );
            }
         }

         if (options.skipIntro) {
            const defaultSettings = {
               seekTo: 10,
               showOn: 0,
               text: "INTROYU ATLA",
            };
            if (typeof options.skipIntro === "number") {
               options.skipIntro = $.extend(defaultSettings, {
                  seekTo: options.skipIntro,
               });
            } else {
               $.extend(defaultSettings, options.skipIntro);
            }
         }

         return options;
      };

      let initializeSaveVolume = () => {
         plugin.on("OnVolumeChange", () => {
            store.saveGlobal("volume", plugin.volume());
            store.saveGlobal("muted", plugin.isMuted());
         });
      };

      let initializeSaveVideoPosition = () => {
         const saveIntervalOnSeconds = 5;
         let lastSavePosition = 0;
         plugin.on("OnTimeUpdateSecond", (e) => {
            let currentTime = Math.floor(e.currentTime);
            if (currentTime !== lastSavePosition) {
               lastSavePosition =
                  Math.floor(currentTime / saveIntervalOnSeconds) *
                  saveIntervalOnSeconds;
               store.save("lastPosition", lastSavePosition);
            }
         });
      };

      let initializeSavePlaybackRate = () => {
         plugin.on("OnPlaybackRateChange", (e) => {
            store.saveGlobal("playbackRate", e.currentRate);
         });
      };

      /* private functions - end */

      plugin.init = function () {
         plugin.settings = $.extend({}, defaults, fixSettings(options));

         $element.addClass("cuspl");

         initializePlayer();

         return plugin;
      };

      /* public functions - start */
      plugin.loadSource = function (source) {
         Player.loadSource(source);
      };

      /* media functions - start */
      plugin.createMediaElement = function (type) {
         let $el = Player.createMediaElement(type);
         $el.addClass("cuspl-media-element");
         return $el;
      };

      plugin.play = function () {
         Player.play();
      };

      plugin.pause = function () {
         Player.pause();
      };

      plugin.mute = function () {
         Player.mute();
      };

      plugin.unmute = function () {
         Player.unmute();
      };

      plugin.isPaused = function () {
         return Player.isPaused();
      };

      plugin.isPlaying = function () {
         return Player.isPlaying();
      };

      plugin.isMuted = function () {
         return Player.isMuted();
      };

      plugin.volume = function (value) {
         return Player.volume(value);
      };

      plugin.seek = function (value) {
         Player.seek(value);
      };

      plugin.playbackRate = function (value) {
         Player.playbackRate(value);
      };

      plugin.getPlaybackRate = function () {
         return Player.getPlaybackRate();
      };

      plugin.getCurrentTime = function () {
         return Player.getCurrentTime();
      };
      plugin.getRemainingTime = function () {
         return Player.getRemainingTime();
      };
      plugin.getDuration = function () {
         return Player.getDuration();
      };

      plugin.isFullscreen = function () {
         return Player.isFullscreen();
      };

      plugin.requestFullscreen = function () {
         Player.requestFullscreen();
      };

      plugin.exitFullscreen = function () {
         Player.exitFullscreen();
      };

      plugin.getViewPanel = function () {
         return Player.getViewPanel();
      };
      /* media functions - end */

      /* preferences functions - start */
      plugin.getPreferences = function () {
         const globalStore = store.getGlobal();

         return {
            muted: globalStore.muted ? globalStore.muted : null,
            volume: globalStore.volume ? globalStore.volume : null,
            playbackRate: globalStore.volume ? globalStore.playbackRate : null,
         };
      };
      /* preferences functions - end */

      /* player plugins - start */
      const watermark = {
         $el: null,
         delay: 0,
         init: function (settings) {
            let _this = this;
            if (!settings) return;

            if (typeof settings === "string") {
               settings = {
                  text: settings,
                  interval: 10000,
               };
            }
            const $viewPanel = Player.getViewPanel();

            this.$el = $(
               '<div class="cuspl-plugin-watermark">' + settings.text + "</div>"
            );

            this.delay = settings.interval;
            const createDelay = () => {
               return this.delay * (1 + Math.random() + 0.5);
            };

            let visible = true;
            let lastTimeout = null;

            const watermarkIntervalFn = () => {
               visible = !visible;

               if (visible) {
                  this.rePosition();
                  this.$el.removeClass("watermark-fadeOut");
                  this.$el.addClass("watermark-fadeIn");
               } else {
                  this.$el.removeClass("watermark-fadeIn");
                  this.$el.addClass("watermark-fadeOut");
               }

               lastTimeout = setTimeout(
                  watermarkIntervalFn,
                  visible ? createDelay() : createDelay() / 2
               );
            };

            plugin.watermark = {
               target: this.$el,
               cleanInterval: () => {
                  clearTimeout(lastTimeout);
               },
            };

            plugin.on("OnPlayerResize", () => {
               _this.rePosition();
            });

            this.rePosition();
            $viewPanel.append(this.$el);
            watermarkIntervalFn();
         },

         rePosition: function () {
            let $viewPanel = Player.getViewPanel();
            let maxLeft = $viewPanel.innerWidth() - this.$el.width();
            let maxTop = $viewPanel.innerHeight() - this.$el.height();

            this.$el.css({
               left: Math.floor(Math.random() * maxLeft) + "px",
               top: Math.floor(Math.random() * maxTop) + "px",
            });
         },
      };

      const alternativeSelector = {
         $el: null,
         init: function (sources) {
            const selectedClasses =
               "cuspl-media-panel-item-selected cuspl-level-selector-item-selected";

            this.$el = plugin.createMediaElement("panel");
            this.$el.addClass("cuspl-alternative-selection");
            let $button = $(
               '<div class="cuspl-media-element-button cuspl-alternative-selection-button"><span class="alt-text"></span><span class="alt-icon"></span></div>'
            );
            this.$el.append($button);
            let $cont = $('<div class="cuspl-media-panel"></div>');
            sources.forEach((source, index) => {
               let $item = $(
                  `<div class="cuspl-media-panel-item cuspl-level-selector-item ${
                     index === 0 ? selectedClasses : ""
                  }">${source.label}</div>`
               );

               $item.click(function () {
                  let isPlaying = plugin.isPlaying();
                  let position = plugin.getCurrentTime();
                  $item
                     .addClass(selectedClasses)
                     .siblings()
                     .removeClass(selectedClasses);
                  plugin.loadSource(source);
                  plugin.seek(position);
                  if (isPlaying) plugin.play();
                  $cont.removeClass("cuspl-media-panel-show");
               });

               $cont.append($item);
            });
            this.$el.append($cont);

            $button.click(function (e) {
               $cont.toggleClass("cuspl-media-panel-show");

               setTimeout(() => {
                  $(document).one("click", function (e) {
                     let $target = $(e.target);
                     if ($target.closest(alternativeSelector.$el).length === 0)
                        $cont.removeClass("cuspl-media-panel-show");
                  });
               });
            });

            Player.addMediaElement(this.$el);
         },
      };

      const skipIntro = {
         $el: null,
         clicked: false,
         init: function (settings) {
            let $el = this.createElement(settings.text);

            $el.click(function () {
               skipIntro.clicked = true;
               plugin.seek(settings.seekTo);
            });

            Player.renderSkipIntro($el);

            plugin.on("OnTimeUpdateSecond", function (e) {
               let currentTime = Math.floor(e.currentTime);

               if (
                  currentTime >= settings.showOn &&
                  currentTime <= settings.seekTo
               ) {
                  $el.addClass("cuspl-skipIntro-button-show");
               } else {
                  $el.removeClass("cuspl-skipIntro-button-show");
               }

               if (skipIntro.clicked) {
                  plugin.off("OnTimeUpdateSecond", arguments.callee);
                  $el.removeClass("cuspl-skipIntro-button-show");
               }
            });
         },
         createElement: function (text) {
            return $(
               `<div class="cuspl-skipIntro-button"><span>${text}</span></div>`
            );
         },
      };

      const customScreens = {
         showOnSecond: null,
         isCustomScreenActive: false,
         settings: null,
         isVideoPlayedOnce: false,
         createShowOnData: function () {
            let createData = {};
            let totalSecond = plugin.getDuration();
            this.settings.forEach((screenSettingBase) => {
               let secondValue = null;
               let itemData = $.extend(
                  {
                     showOn: null,
                     pauseOnShow: true,
                     render: () => "",
                     afterRender: (plugin) => {},
                     showed: false,
                     isShowing: false,
                     alwaysShow: true,
                  },
                  screenSettingBase
               );

               let showOn = itemData.showOn;
               switch (typeof showOn) {
                  case "number":
                     {
                        if (showOn < 0) {
                           secondValue = Math.floor(totalSecond + showOn);
                        } else {
                           secondValue = showOn;
                        }
                     }
                     break;
                  case "string":
                     {
                        if (showOn.substr(-1) === "%") {
                           let rate = parseFloat(
                              showOn.substr(0, showOn.length - 1) / 100
                           );
                           secondValue = Math.floor(totalSecond * rate);
                        } else if (showOn === "end") {
                           secondValue = Math.floor(totalSecond);
                        } else if (showOn === "start") {
                           secondValue = 0;
                        } else if (showOn === "center") {
                           secondValue = Math.floor(totalSecond / 2);
                        }
                     }
                     break;
               }

               createData[secondValue] = itemData;
            });
            if (createData !== null) this.showOnSecond = createData;
         },
         init: function (settings) {
            if (!settings) return;
            this.settings = settings;
            let _this = this;
            plugin.on("OnTimeUpdateSecond", function (e) {
               if (!_this.isVideoPlayedOnce) return;
               let position = Math.floor(e.currentTime);
               if (_this.showOnSecond == null && e.duration !== 0)
                  _this.createShowOnData();

               if (_this.showOnSecond == null) return;

               if (
                  _this.isCustomScreenActive &&
                  Math.floor(e.duration) === position
               )
                  plugin.pause();

               let showOnKeys = Object.keys(_this.showOnSecond);
               let showKeys = showOnKeys.filter((p) => parseInt(p) <= position);
               showKeys.forEach((key) => {
                  let customScreenData = _this.showOnSecond[key];
                  if (
                     customScreenData !== undefined &&
                     !customScreenData.isShowing &&
                     (customScreenData.alwaysShow || !customScreenData.showed)
                  ) {
                     customScreenData.showed = true;
                     customScreenData.isShowing = true;
                     _this.isCustomScreenActive = true;
                     let $customScreen = $(
                        '<div class="cuspl-custom-screen"></div>'
                     );
                     customScreenData.dom = customScreenData.render();
                     $customScreen.append(customScreenData.dom);

                     if (customScreenData.pauseOnShow) plugin.pause();

                     $customScreen.addClass("cuspl-cs-show");
                     customScreenData.afterRender({
                        screen: $customScreen,
                     });
                     Player.getViewPanel().append($customScreen);

                     $customScreen.on(
                        "click",
                        ".cuspl-cs-clickable",
                        function () {
                           plugin.pause();
                        }
                     );
                  }
               });
               let hideKeys = showOnKeys.filter((p) => parseInt(p) > position);
               hideKeys.forEach((key) => {
                  if (_this.showOnSecond[key].dom) {
                     _this.showOnSecond[key].dom.parent().remove();
                     _this.showOnSecond[key].isShowing = false;
                  }
               });
            });

            plugin.one("OnPlay", function () {
               _this.isVideoPlayedOnce = true;
            });
         },
      };

      const playbackRates = {
         $el: null,
         init: function (rateSettings) {
            if (rateSettings == null) return;

            const selectedClasses =
               "cuspl-media-panel-item-selected cuspl-playback-rate-item-selected";
            const defaultPlaybackValue = plugin.settings.playbackRates.options.find(
               (p) => p.value === plugin.settings.playbackRates.defaultValue
            );

            this.$el = plugin.createMediaElement("panel");
            this.$el.addClass("cuspl-playback-rates");
            let $button = $(
               `<div class="cuspl-media-element-button cuspl-playback-rates-button"><span class="cuspl-playback-rates-text">${defaultPlaybackValue.label}</span><span class="cuspl-playback-rates-icon"></span></div>`
            );
            this.$el.append($button);
            let $cont = $('<div class="cuspl-media-panel"></div>');
            const currentRate = plugin.getPlaybackRate();
            rateSettings.options.forEach((item, index) => {
               let $item = $(
                  `<div class="cuspl-media-panel-item cuspl-playback-rate-item ${
                     currentRate === item.value ? selectedClasses : ""
                  }" data-cuspl-playback-rate-value="${item.value}">${
                     item.label
                  }</div>`
               );

               $item.click(function () {
                  $cont.removeClass("cuspl-media-panel-show");

                  plugin.playbackRate(item.value);
               });

               $cont.append($item);
            });
            this.$el.append($cont);

            $button.click(function (e) {
               $cont.toggleClass("cuspl-media-panel-show");

               setTimeout(() => {
                  $(document).one("click", function (e) {
                     let $target = $(e.target);
                     if ($target.closest(playbackRates.$el).length === 0)
                        $cont.removeClass("cuspl-media-panel-show");
                  });
               });
            });

            plugin.on("OnPlaybackRateChange", function (e) {
               let rateText = e.currentRate + "x";
               let rateData = e.rates.find((p) => p.value === e.currentRate);
               if (rateData) rateText = rateData.label;

               $cont
                  .find(`[data-cuspl-playback-rate-value="${e.currentRate}"]`)
                  .addClass(selectedClasses)
                  .siblings()
                  .removeClass(selectedClasses);
               $button.children(".cuspl-playback-rates-text").text(rateText);
            });

            Player.addMediaElement(this.$el);
         },
      };

      const fastMediaButtons = {
         $el: null,
         createElements: function () {
            this.$el = $('<div class="cuspl-big-media-buttons"></div>');
            let buttons = {};

            let $buttonTemplate = $('<div class="cuspl-bmb-item"></div>');

            if (plugin.settings.previousButton) {
               buttons.previous = $buttonTemplate.clone();
               buttons.previous.addClass("cuspl-bmb-previous");
            }

            if (plugin.settings.nextButton) {
               buttons.next = $buttonTemplate.clone();
               buttons.next.addClass("cuspl-bmb-next");
            }

            buttons.fastBackward = $buttonTemplate.clone();
            buttons.fastBackward
               .addClass("cuspl-bmb-fast-backward")
               .append(`<span>${plugin.settings.fastBackwardValue}</span>`);

            buttons.fastForward = $buttonTemplate.clone();
            buttons.fastForward
               .addClass("cuspl-bmb-fast-forward")
               .append(`<span>${plugin.settings.fastForwardValue}</span>`);

            buttons.playPause = $buttonTemplate.clone();
            buttons.playPause.addClass("cuspl-bmb-playPause");

            if (buttons.previous) this.$el.append(buttons.previous);
            this.$el.append(buttons.fastBackward);
            this.$el.append(buttons.playPause);
            this.$el.append(buttons.fastForward);
            if (buttons.next) this.$el.append(buttons.next);

            return buttons;
         },
         createButtonEvents: function (elements) {
            /* playPause */
            elements.playPause.click(function () {
               if (plugin.isPlaying()) plugin.pause();
               else plugin.play();
            });

            plugin.on("OnPause", function () {
               elements.playPause
                  .addClass("cuspl-bmb-playPause-paused")
                  .removeClass("cuspl-bmb-playPause-playing");
            });
            plugin.on("OnPlay", function () {
               elements.playPause
                  .removeClass("cuspl-bmb-playPause-paused")
                  .addClass("cuspl-bmb-playPause-playing");
            });

            /* fastSeek */
            elements.fastForward.click(function () {
               let value =
                  plugin.getCurrentTime() + plugin.settings.fastForwardValue;
               let duration = plugin.getDuration();
               if (value >= duration) value = duration;
               plugin.seek(value);

               elements.fastForward.addClass("cuspl-bmb-ff-animate");
            });

            elements.fastForward.on(
               "animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd",
               function () {
                  elements.fastForward.removeClass("cuspl-bmb-ff-animate");
               }
            );

            elements.fastBackward.click(function () {
               let value =
                  plugin.getCurrentTime() +
                  plugin.settings.fastBackwardValue * -1;
               if (value <= 0) value = 0;
               plugin.seek(value);

               elements.fastBackward.addClass("cuspl-bmb-fb-animate");
            });

            elements.fastBackward.on(
               "animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd",
               function () {
                  elements.fastBackward.removeClass("cuspl-bmb-fb-animate");
               }
            );

            /* change video */
            if (plugin.settings.previousButton) {
               elements.previous.click(plugin.settings.previousButton);
            }

            if (plugin.settings.nextButton) {
               elements.next.click(plugin.settings.nextButton);
            }
         },
         init: function () {
            let _this = this;
            let elements = _this.createElements();
            _this.createButtonEvents(elements);
            Player.getViewPanel().append(_this.$el);

            plugin.one("OnPlay", function () {
               elements;
               _this.$el.addClass("cuspl-big-media-buttons-active");
               elements.playPause
                  .removeClass("cuspl-bmb-playPause-paused")
                  .addClass("cuspl-bmb-playPause-playing");
            });

            plugin.on("OnUserActive", function () {
               _this.$el
                  .addClass("cuspl-big-media-buttons-active")
                  .removeClass("cuspl-big-media-buttons-inactive");
            });

            plugin.on("OnUserInactive", function () {
               _this.$el
                  .removeClass("cuspl-big-media-buttons-active")
                  .addClass("cuspl-big-media-buttons-inactive");
            });
         },
      };

      const keyboardShortcuts = {
         init: function () {
            plugin.on("OnKeyDown", (args) => {
               switch (args.keyCode) {
                  case 39:
                     keyboardShortcuts.functions.ArrowRight();
                     break;
                  case 37:
                     keyboardShortcuts.functions.ArrowLeft();
                     break;
                  case 38:
                     keyboardShortcuts.functions.ArrowUp();
                     break;
                  case 40:
                     keyboardShortcuts.functions.ArrowDown();
                     break;
                  case 32:
                     keyboardShortcuts.functions.Space();
                     break;
                  case 27:
                     keyboardShortcuts.functions.Escape();
                     break;
                  case 70:
                     keyboardShortcuts.functions.KeyF();
                     break;
                  case 77:
                     keyboardShortcuts.functions.KeyM();
                     break;
               }
            });
         },
         lastVolume: null,
         functions: {
            //Quick Forward
            ArrowRight: () => {
               let value =
                  plugin.getCurrentTime() + plugin.settings.fastForwardValue;
               let duration = plugin.getDuration();
               if (value >= duration) value = duration;
               plugin.seek(value);
            },
            //Quick Backward
            ArrowLeft: () => {
               let value =
                  plugin.getCurrentTime() +
                  plugin.settings.fastBackwardValue * -1;
               if (value <= 0) value = 0;
               plugin.seek(value);
            },
            //Volume up
            ArrowUp: () => {
               const increment = 0.1;
               let volume = plugin.volume() + increment;
               if (volume > 1) volume = 1;

               plugin.volume(volume);
            },
            //Volume down
            ArrowDown: () => {
               const decrement = 0.1;
               let volume = plugin.volume() + decrement * -1;
               if (volume < 0) volume = 0;

               plugin.volume(volume);
            },
            //Play/Pause
            Space: () => {
               if (plugin.isPlaying()) plugin.pause();
               else plugin.play();

               return false;
            },
            Escape: () => {
               if (plugin.isFullscreen()) plugin.exitFullscreen();
            },
            KeyF: () => {
               plugin.requestFullscreen();
            },
            KeyM: () => {
               if (!plugin.isMuted()) plugin.mute();
               else plugin.unmute();
            },
         },
      };
      /* player plugins - end */

      store.initializeMainStore();
      plugin.init();
   };

   $.fn.cuspl = function (options) {
      if (undefined == $(this).data("cuspl")) {
         var plugin = new $.cuspl(this, options);
         $(this).data("cuspl", plugin);
      }

      return $(this).data("cuspl");
   };
})(jQuery);
