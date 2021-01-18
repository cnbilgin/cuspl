/* cnbilgin 
   https://github.com/cnbilgin/cuspl
*/

function cusplVideoJsPlayer({ eventTrigger, getPlayerData }) {
   let player = {};
   player.ref = null;

   player.initialize = () => {
      const PlayerData = getPlayerData();
      const videojsId = PlayerData.playerId + "-videoJs";
      let $video = $(
         `<video 
            id="` +
            videojsId +
            `" 
            class="video-js vjs-theme-doping"
            preload="auto"
            width="` +
            PlayerData.settings.size.width +
            `"
            height="` +
            PlayerData.settings.size.height +
            `"
            playsinline="true"
         />`
      );

      if (!PlayerData.settings.source) $video.attr("preload", "none");

      if (PlayerData.settings.poster)
         $video.attr("poster", PlayerData.settings.poster);

      PlayerData.$player.append($video);

      let playerSettings = {
         controlBar: {
            pictureInPictureToggle: false,
         },
         fluid: true,
         errorDisplay: false,
      };

      if (PlayerData.settings.aspectRatio)
         playerSettings.aspectRatio = PlayerData.settings.aspectRatio;

      playerSettings.html5 = {
         hls: {
            overrideNative: true,
         },
         nativeAudioTracks: false,
         nativeVideoTracks: false,
      };

      playerSettings.controls = true;

      player.ref = videojs(videojsId, playerSettings);

      if (PlayerData.settings.source)
         player.loadSource(PlayerData.settings.source[0]);

      createBasicEvents();

      player.ref.ready(() => {
         initializeEvents();
      });
      // initializeEvents();

      return player.ref;
   };

   /* source: {src: 'Video Source', label: 'Source Name (eg Alternative, 720p ...)', type:'Source Media Type (eg application/x-mpegURL)'}*/
   player.loadSource = (source) => {
      player.ref.src({
         src: source.src,
         type: source.type,
      });
   };

   player.getViewPanel = () => {
      return $(player.ref.el_);
   };

   player.play = () => {
      player.ref.play();
   };

   player.isPlaying = () => {
      return !player.ref.paused();
   };

   player.pause = () => {
      player.ref.pause();
   };

   player.isPaused = () => {
      return player.ref.paused();
   };

   player.mute = () => {
      return player.ref.muted(true);
   };
   player.unmute = () => {
      return player.ref.muted(false);
   };
   player.isMuted = () => {
      return player.ref.muted();
   };

   player.seek = (seconds) => {
      player.ref.currentTime(seconds);
   };

   player.playbackRate = (value) => {
      setTimeout(() => {
         player.ref.playbackRate(value);
      });
   };

   player.getPlaybackRate = () => {
      return player.ref.playbackRate();
   };

   player.getCurrentTime = () => {
      return player.ref.currentTime();
   };
   player.getRemainingTime = () => {
      return player.ref.remainingTime();
   };
   player.getDuration = () => {
      return player.ref.duration();
   };

   /* value is percent as decimal eg 0.5 = half */
   player.volume = (value) => {
      if (value != null) player.ref.volume(value);

      return player.ref.volume();
   };

   player.isFullscreen = () => {
      return player.ref.isFullscreen();
   };

   player.requestFullscreen = () => {
      player.ref.requestFullscreen();
   };

   player.exitFullscreen = () => {
      player.ref.exitFullscreen();
   };

   player.createMediaElement = (type) => {
      let classes = ["vjs-control"];
      switch (type) {
         case "panel":
            classes.push("vjs-menu-button-popup");
         case "button":
            classes.push("vjs-button", "vjs-menu-button");
            break;
      }
      let $el = $(`<div class="${classes.join(" ")}">
   </div>`);

      return $el;
   };

   player.addMediaElement = ($el) => {
      let $player = player.getViewPanel();
      let $mediaBar = $player.find(".vjs-control-bar");
      let $fullscreenControl = $mediaBar.find(".vjs-fullscreen-control");

      $fullscreenControl.before($el);
   };

   player.renderSkipIntro = ($el) => {
      let $viewPanel = player.getViewPanel();

      $viewPanel.append($el);
   };

   const eventHelper = {};

   /* Cuspl Event => VideoJs Event {OnReady : "ready" ...}  */
   const createBasicEvents = () => {
      const eventDictionary = {
         OnReady: "ready",
         OnTimeUpdate: "timeupdate",
         OnPlay: "play",
         OnPause: "pause",
         OnEnded: "ended",
         OnVolumeChange: "volumechange",
         OnPlaybackRateChange: "ratechange",
         OnUserActive: "useractive",
         OnUserInactive: "userinactive",
         OnPlayerResize: "playerresize",
         OnFullscreenChanged: "fullscreenchange",
      };

      Object.keys(eventDictionary).forEach((cusplEvent) => {
         let videoJsEvent = eventDictionary[cusplEvent];
         let eventObject = {
            fn: () => {
               eventTrigger(cusplEvent);
            },
         };

         eventObject.bind = function () {
            player.ref.on(videoJsEvent, eventObject.fn);
         };

         eventObject.unbind = function () {
            player.ref.off(videoJsEvent, eventObject.fn);
         };

         eventHelper[cusplEvent] = eventObject;
      });
   };

   const initializeEvents = () => {
      Object.keys(eventHelper).forEach((key) => {
         eventHelper[key].bind();
      });
   };

   const createOnTimeUpdateSecondData = () => {
      let event = {};

      let lastSecond = 0;
      event.fn = () => {
         let currentSecond = Math.floor(player.ref.currentTime());
         if (currentSecond !== 0 && currentSecond !== lastSecond) {
            lastSecond = currentSecond;
            eventTrigger("OnTimeUpdateSecond");
         }
      };

      event.bind = () => {
         player.ref.on("timeupdate", event.fn);
      };

      event.unbind = () => {
         player.ref.off("timeupdate", event.fn);
      };

      return event;
   };

   eventHelper.OnTimeUpdateSecondData = createOnTimeUpdateSecondData();

   return player;
}
