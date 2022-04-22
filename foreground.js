// https://jb-hifi.com/#/grab?id=1412615603866906625
// 100/(200/7,03) = pourcentage
// Disable multiple injection on same tab
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.text === 'are_you_there_content_script?') {
    sendResponse({status: "yes"});
  }
});

class Bot {

  constructor(){

    var parent = this;

    this.manifestData = chrome.runtime.getManifest();

    this.options = null;
    this.$wrap = document.querySelector('.wa_page');
    this.$debugBlock;
    this.wallets = {};
    this.ordersCompleted;
    this.counterInterval;
    this.currentUrl;
    this.refreshStepIndex;
    this.nextRefreshStepIndex;

    this.createDebugbar();
    this.setOrdersCompleted(0);
    
    setTimeout(function(){
      parent.getOptions().then(function(){
        parent.init();
      });
    }, 500);

  }

  createDebugbar(){

    var parent = this;

    this.$debugBlock = document.createElement('div');

    var debugHTML = '';

    debugHTML += '<h1>Bot <span>by harkor</span></h1>';

    debugHTML += '<ul>';
      debugHTML += '<li class="orders-completed">Orders completed: <span class="value">?</span></li>';
    debugHTML += '</ul>';
    debugHTML += '<ul>';
      debugHTML += '<li class="next-grab-delay">Next grab in : <span class="value">?</span></li>';
    debugHTML += '</ul>';

    debugHTML += '<span class="version">v'+ this.manifestData.version +'</span>';

    this.$debugBlock.classList.add('debugbar');
    this.$debugBlock.innerHTML = debugHTML;

    // Add result to wrapper
    this.$wrap.appendChild(this.$debugBlock);

  }

  async init(){

    var parent = this;

    console.log('App is loaded');

    await sleep(2 * 1000); // Wait 2 seconds

    parent.setOrdersCompleted(parseInt(document.querySelectorAll('.count_content')[2].querySelector('h1').innerHTML));

    parent.doGrab();

  }

  async doGrab(){

    var parent = this;

    while(parent.ordersCompleted < parent.options.max_completed_orders){

      console.log('do grab');

      document.querySelector('.grab_content .btns .bg-blue').click();
      
      await sleep(15 * 1000);

      console.log('validate button');

      document.querySelector('.check_order .btns .btn.submit').click();
      
      await sleep(2 * 1000);

      parent.setOrdersCompleted(parseInt(document.querySelectorAll('.count_content')[2].querySelector('h1').innerHTML));
      
      await sleep(3 * 1000);

    }

    console.log('No more grabs for today');

    parent.setNextRefresh();

  }

  setOrdersCompleted(value){
    this.ordersCompleted = value;
    this.$debugBlock.querySelector('.orders-completed .value').innerHTML = value;
  }

  setNextGrabDelay(value){
    this.$debugBlock.querySelector('.next-grab-delay .value').innerHTML = value;
  }

  async setNextRefresh(){

    var parent = this;

    var today = new Date();

    var nextRefreshIn;
    if(today.getHours() >= parent.options.hours_at_regrab){

      var tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(parent.options.hours_at_regrab);
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);
      
      nextRefreshIn = (tomorrow.getTime() - today.getTime())/1000;

    } else {

      var nextDate = new Date(today);
      nextDate.setHours(parent.options.hours_at_regrab);
      nextDate.setMinutes(0);
      nextDate.setSeconds(0);
      
      nextRefreshIn = (nextDate.getTime() - today.getTime())/1000;

    }

    nextRefreshIn = 10;

    var counter = nextRefreshIn;
    setInterval(function(){
      parent.setNextGrabDelay(parent.delayForHuman(counter));
      counter--;
    }, 1000);

    await sleep(nextRefreshIn * 1000);

    document.querySelector('.wa_footer .item').click();
    await sleep(3 * 1000);
    document.querySelector('.grab_wrap').click();
    await sleep(3 * 1000);
    location.reload();

  }

  getOptions(){

    var parent = this;

    return new Promise((resolve, reject) => {

      var httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function(){
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          if (httpRequest.status === 200) {
            var defaultOptions = JSON.parse(httpRequest.response);
            chrome.storage.local.get('options', (data) => {
              
              var savedOptions;

              if(data.options != undefined){
                savedOptions = data.options;
              } else {
                savedOptions = {};
              }

              var mergedOptions = { ...defaultOptions, ...savedOptions };
              parent.setOptions(mergedOptions);

              resolve(mergedOptions);

            });
          }
        }
      };

      httpRequest.open('GET', chrome.runtime.getURL('defaultOptions.json'));
      httpRequest.send();

    });
  
  }

  setOptions(value){
    
    value.max_completed_orders = parseInt(value.max_completed_orders);
    value.hours_at_regrab = parseInt(value.hours_at_regrab);

    this.options = value;

  }

  delayForHuman(seconds){

    var levels = [
      [Math.floor(seconds / 31536000), 'years'],
      [Math.floor((seconds % 31536000) / 86400), 'days'],
      [Math.floor(((seconds % 31536000) % 86400) / 3600), 'hours'],
      [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'minutes'],
      [(((seconds % 31536000) % 86400) % 3600) % 60, 'seconds'],
    ];

    var returntext = '';

    for (var i = 0, max = levels.length; i < max; i++) {
        if ( levels[i][0] === 0 ) continue;
        returntext += ' ' + levels[i][0] + ' ' + (levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length-1): levels[i][1]);
    };

    return returntext.trim();

  }

}

console.log('Bot injected');

new Bot;

const sleep = ms => new Promise(r => setTimeout(r, ms));
