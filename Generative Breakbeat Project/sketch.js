//Drum loop and data
let drumLoop;
let breakBpm;
//ML globals
let classifier;
let fft;
let results = [];
//Slice arrays
let audioSlices = [];
let kicks;
let snares;
let hihats;
//NGram globals
let txt = "khsshkshhkssskshshhskksshssk";
let order = 2;
let ngrams = {};
//HTML elements and data
let playPause;
let genButton;
let recordButton;
let playVal = 0;
let genVal = 0;
let recordingVal = 0;
let bpmSelector;
let barSelector;
let beatsSelector;
let beatP;
//New beat and playback data
let newBeat = [];
let bars = 1;
let beatsNewBars = 4;
let stepInterval; // [AI]
let lastStepTime = 0; // [AI]
let stepIndex = 0; // [AI]


function preload(){
  //Load drum loop
  drumLoop = loadSound("drums/amen 1 bar.wav");
  
  //Load ML model
  classifier = ml5.neuralNetwork({
    task: "classification"
  });
  classifier.load({
    model: "model/model.json",
    metadata: "model/model_meta.json",
    weights: "model/model.weights.bin"
  });
}

function setup() {
  noCanvas();
  let startButton = createButton("Create Drum Machine");
  startButton.mousePressed(() => {
    startButton.remove();
    init();
    });
  }
  
function init(){
  let numSlices = 8;
  let beatsPerBar = 4;
  let barCount = 1;
  let nGramBuffer = [];

  //Calculate BPM and interval between 8th notes (ms)
  breakBpm = ((beatsPerBar * barCount) *60) / drumLoop.duration();
  stepInterval = (60 / 160) * 1000 / 2; // [AI]
  console.log("File Duration = " + drumLoop.duration());
  console.log("BPM = " + breakBpm);
  
  //Calculate audio slices
  let sliceDuration =  drumLoop.duration() / numSlices;
  let slice;
  for(let i = 0; i < numSlices; i++){
    slice = {name: i+1, start: sliceDuration * i, dur: sliceDuration};
    audioSlices.push(slice);
  }
  console.log("Audio Slices: ");
  console.log(audioSlices);
  
  //Fast Fourier Transform to analyse frequencies of slices
  fft = new p5.FFT();
  fft.setInput(drumLoop);
  
  //Async function forces startup to wait for slice classification to complete before creating GUI elements
  classifyAllSlices().then(() => { // [AI]
    console.log("All slices classified:");
    console.log(results);
    
    //Put slices into the correct array according to their classification
    setSliceClasses();
    console.log("Kicks: " + kicks);
    console.log("Snares: " + snares);
    console.log("Hihats: " + hihats);
    
    //Create ngrams and put into ngrams array
    for(let j = 0; j < txt.length - order; j++){
      let gram = txt.substring(j,j+order);
    
      if(!ngrams[gram]){
        ngrams[gram] = [];
      } 
      ngrams[gram].push(txt.charAt(j+order));
    
    }
  
    //Generate Button
    genButton = createButton("Generator Off");
    //Change genVal & other button values which may clash with the change
    genButton.mousePressed(() => {genVal = 1 - genVal;
      if(genVal == 1){genButton.html("Generator On"); 
          recordingVal = 0; 
          recordButton.html("Record Beat");
          generate();} 
      else{genButton.html("Generator Off");
           playVal = 0;
           playPause.html("Play");
           newBeat = []; 
           beatP.html("Make your own beat by pressing the Record Button and selecting clips");
      }
    });
  
    //Play/Pause Button
    playPause = createButton("Play");
    //Change playVal as long as recording is not in progress
    playPause.mousePressed(() => {if(recordingVal == 0 && newBeat.length >= 1){
        playVal = 1 - playVal; 
        if(playVal == 1){playPause.html("Pause");} else{playPause.html("Play");}
      }
    });
  
    beatP = createP("Make your own beat by pressing the Record Button and selecting clips");
    createP("Drum Pad:");
  
    //Recording Button
    recordButton = createButton("Record Beat");
    //Change genVal & other button values which may clash with the change
    recordButton.mousePressed(() => {recordingVal = 1 - recordingVal; playVal = 0; playPause.html("Play");
        newBeat = [];
        if(recordingVal == 1){
          recordButton.html("Cancel Recording");
          beatP.html("Play drum clips to add them to the new beat");
          genVal = 0;
          genButton.html("Generator Off");
        }
        else{
          recordButton.html("Record Beat");                                
          if(newBeat.length < bars * beatsNewBars * 2){
            newBeat = [];
            beatP.html("Plese ensure recorded beats adhere to your specifications. <br> Your beat should contain " + bars *   beatsNewBars * 2 + " audio slices.");
          }
        }
      });
  
  //DrumPad
  //Kick Drums
  createP("<br>").class("buttSpace");

  let drumCount = 0
  for(let i = 0; i < kicks.length; i++){
    let drumPad = createButton("Kick " + (i+1));
    drumPad.mousePressed(() => {
      let type = "k"
      playClip(kicks[i], breakBpm);
      
      if(recordingVal == 1){
        newBeat.push(kicks[i]);
        nGramBuffer.push(type);
        console.log(nGramBuffer);
        txt = txt + type
        beatP.html("Recorded Beat: " + "<br>" + newBeat);
        
        if(newBeat.length == bars * beatsNewBars * 2){
          recordingVal = 0;
          recordButton.html("Record Beat");
          
          //Update ngrams to include user-made drum beats
          for(let j = 0; j < newBeat.length - order; j++){
            let gram = nGramBuffer.join("").substring(j,j+order);
    
            if(!ngrams[gram]){
              ngrams[gram] = [];
            } 
            ngrams[gram].push(nGramBuffer.join("").charAt(j+order));
    
          }
          console.log("NGrams:");
          console.log(ngrams);
        }
      }
    });
    drumCount += 1
  }
  createP("<br>").class("buttSpace");
  //Snare Drums
  for(let i = 0; i < snares.length; i++){
    let drumPad = createButton("Snare " + (i+1));
    drumPad.mousePressed(() => {
      let type = "s"
      playClip(snares[i], breakBpm);
      
      if(recordingVal == 1){
        newBeat.push(snares[i]);
        nGramBuffer.push(type);
        console.log(nGramBuffer);
        txt = txt + type
        beatP.html("Recorded Beat: " + "<br>" + newBeat);
        
        if(newBeat.length == bars * beatsNewBars * 2){
          recordingVal = 0;
          recordButton.html("Record Beat");
          
          //Update ngrams to include user-made drum beats
          for(let j = 0; j < newBeat.length - order; j++){
            let gram = nGramBuffer.join("").substring(j,j+order);
    
            if(!ngrams[gram]){
              ngrams[gram] = [];
            } 
            ngrams[gram].push(nGramBuffer.join("").charAt(j+order));
    
          }
          console.log("NGrams:");
          console.log(ngrams);
        }
      }
    });
    drumCount += 1
  }
  createP("<br>").class("buttSpace");
    
  //Hihats
  for(let i = 0; i < hihats.length; i++){
    let drumPad = createButton("Hihat " + (i+1));
    drumPad.mousePressed(() => {
      let type = "h"
      playClip(hihats[i], breakBpm);
      
      if(recordingVal == 1){
        newBeat.push(hihats[i]);
        nGramBuffer.push(type);
        console.log(nGramBuffer);
        txt = txt + type
        beatP.html("Recorded Beat: " + "<br>" + newBeat);
        
        if(newBeat.length == bars * beatsNewBars * 2){
          recordingVal = 0;
          recordButton.html("Record Beat");
          
          //Update ngrams to include user-made drum beats
          for(let j = 0; j < newBeat.length - order; j++){
            let gram = nGramBuffer.join("").substring(j,j+order);
    
            if(!ngrams[gram]){
              ngrams[gram] = [];
            } 
            ngrams[gram].push(nGramBuffer.join("").charAt(j+order));
    
          }
          console.log("NGrams:");
          console.log(ngrams);
        }
      }
    });
    drumCount += 1
  }
  

  
  //BPM NumberBox
  createP("Playback BPM:");
  bpmSelector = createInput("160", "number");
  bpmSelector.input(() => {stepInterval = (60 / bpmSelector.value()) * 1000 / 2;});
  
  //Bar Count NumberBox
  createP("Bars in New Beat:");
  barSelector = createInput("1", "number");
  barSelector.input(() => {bars = barSelector.value(); recordingVal = 0;; recordButton.html("Record Beat");});
  
  //Beats per-bar NumberBox
  createP("Beats Per-Bar:");
  beatsSelector = createInput("4", "number");
  beatsSelector.input(() => {beatsNewBars = beatsSelector.value(); recordingVal = 0; recordButton.html("Record Beat");});

  
  console.log("NGrams: ");
  console.log(ngrams);
  });
}

function draw() {
  background(220);
  
  if(newBeat.length >= 1 && playVal == 1){
    let timeNow = millis(); // [AI]
    
    if(timeNow - lastStepTime >= stepInterval){ // [AI]
      console.log("Index " + stepIndex);
      
      if(genVal == 1){
        playClip(selectClip(newBeat[stepIndex]), bpmSelector.value());
        if(stepIndex == newBeat.length - 1){
          let lastGram = "k"
          lastGram = lastGram + newBeat[stepIndex];
          generate(lastGram);
        }
      }
      else{playClip(newBeat[stepIndex], bpmSelector.value());}

      stepIndex = (stepIndex + 1) % newBeat.length;
      lastStepTime = timeNow; // [AI]
      
    }
  }
  else{
    stepIndex = 0;
  }
}

//Function to play back a selected drum
function playClip(index, playbackBpm){
  let rateMul = playbackBpm / breakBpm;
  let slice = audioSlices[index-1];
  drumLoop.play(0,rateMul,0.8, slice.start, slice.dur);
  console.log("Playing Clip: " + slice.name)
}

//Use ngrams to create a new beat (sets newBeat)
function generate(sequenceEnd){
  let currentGram;
  if(sequenceEnd != null){
    
    currentGram = sequenceEnd;
  }
  else{
    currentGram = txt.substring(0, order);
  }
  
  let result = currentGram;
  
  while(result.length < bars * beatsNewBars * 2){
    let possibilities = ngrams[currentGram];
    if(!possibilities){
      currentGram = txt.substring(0,order);
      possibilities = ngrams[currentGram];
    }
    
    let next = random(possibilities);
    result += next;
    let len = result.length;
    currentGram = result.substring(len-order, len)
  }
  
  newBeat = Array.from(result)
  beatP.html("Generated Beat: " + "<br>" + newBeat);
  console.log("New Beat: ");
  console.log(newBeat);
}

//Select an audio clip at random from the given drum selection
function selectClip(drumType){
  let clipNum;
  if(drumType == "k"){clipNum = random(kicks);}
  else if(drumType == "s"){clipNum = random(snares);}
  else if(drumType == "h"){clipNum = random(hihats);}
  return clipNum;
}

async function classifyAllSlices() {
  for(let i = 0; i < audioSlices.length; i++){
    const f = await getSliceFFT(audioSlices[i]);
    let result = await classifier.classify(f);
    results.push(result);
  }
} // [AI]
  
function getSliceFFT(slice){
  return new Promise((resolve) => {
    drumLoop.play(0,1,1, slice.start, slice.dur);
      
      const accumulator = {
        bass: 0,
        lowMid: 0,
        mid: 0,
        highMid: 0,
        treble: 0,
        centroid: 0,
        rms: 0
       };
      
     let frames = 0;
     const sampleInterval = 10; //Interval given in ms
     const totalSamples = Math.max(10, Math.floor(slice.dur *1000 / sampleInterval));
     
      setTimeout(() => { // [AI]
      const id = setInterval(() => { // [AI]
        fft.analyze();
        accumulator.bass += fft.getEnergy("bass");
        accumulator.lowMid += fft.getEnergy("lowMid");
        accumulator.mid += fft.getEnergy("mid");
        accumulator.highMid += fft.getEnergy("highMid");
        accumulator.treble += fft.getEnergy("treble");
        accumulator.centroid += fft.getCentroid();
        accumulator.rms += fft.getEnergy(20, 20000);
        frames++;
          
        if(frames >= totalSamples){
          clearInterval(id);
          drumLoop.stop();
            
          for(let key in accumulator){
            accumulator[key] /= frames;
              
          }
          resolve(accumulator);
        } // [AI]
          
      }, sampleInterval);

    }, 50);
  });
}

function setSliceClasses(){
  kicks = [];
  snares = [];
  hihats = [];
  for(let i = 0; i < results.length; i++){
    let result = results[i]
    let prediction = result[0].label
    
    if(prediction == "kick"){
      kicks.push(i+1);
    }
    else if(prediction == "snare"){
      snares.push(i+1);
    }
    else if(prediction == "hihat"){
      hihats.push(i+1);
    }
  }
}