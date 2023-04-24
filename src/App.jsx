import "./App.css";
import {Howl} from 'howler';
import { initNotifications, notify } from '@mycv/f8-notification';
// import * as tf from '@tensorflow/tfjs'
import React,{useEffect, useRef,useState} from "react";
import soundURL from './assets/download.mp3'
const mobilenet = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABLE ='not_touch';
const TOUCHED_LABLE ='touched';

const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function App() {
  const video = useRef()
  const classifier = useRef()
  const mobilenetModule = useRef()
  const canPlaySound = useRef(true)
  const [touched,setTouched] = useState(false)




  const init= async()=>{
    console.log("init ...");
    await setupCamera()
    console.log("setup camera success");
     classifier.current = knnClassifier.create();
     mobilenetModule.current = await mobilenet.load();

    console.log("setup done");
    console.log("Không chạm tay lên mặt và bấm Trans1");
    initNotifications({ cooldown: 3000 });
  }
  const setupCamera=()=>{
    return new Promise((resolve,reject)=>{
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia||navigator.msGetUserMedia
        if(navigator.getUserMedia){
          navigator.getUserMedia(
            {
              video : true
            }
            ,stream=>{
              video.current.srcObject =stream
              video.current.addEventListener('loadeddata', resolve)
            },
            error=> reject(error)
          );
        }
    })
  }

  const train = async lable =>{
    console.log(`[${lable}] Dang trên cho máy tìm mặt bạn ...`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i+1)/TRAINING_TIMES*100)}%`)
      await training(lable)
    }
  }
/**
 *Bước 1 Không chạm tay lên mặt 
 *  Bước 2 : Train cho máy khuôn mặt không chạm tay
 *  Bước 3 Lấy hình ảnh hiện tại , phân tích và so sánh với data đã học trước đó
 * ==> Nếu nó matching với data khuân mặt chạm tay => cảnh bảo
 */
  const training = lable=>{
    return new Promise(async resolve=>{
      const embedding = mobilenetModule.current.infer(video.current,true);
      classifier.current.addExample(embedding,lable);
      await sleep(100);
      resolve()
    })
  }
  const run = async () =>{
    const embedding = mobilenetModule.current.infer(video.current,true);
    const result = await classifier.current.predictClass(embedding);
    console.log('Label : ', result.label);
    console.log('Confidences : ', result.confidences);
    if(result.label === TOUCHED_LABLE && result.confidences[result.label] > TOUCH_CONFIDENCE){
      console.log('Touched');
      if(canPlaySound.current){
        canPlaySound.current =false
        sound.play();
      }
      notify('Bỏ tay ra', { body: 'Bạn vừa chạm vào mặt.' });
      setTouched(true);
    }else{
      console.log('not_touched');
      setTouched(false);

    }

    await sleep(200);
    run()
  }

  const sleep=(ms = 0)=>{
    return new Promise(resolve=> setTimeout(resolve,ms))
  }

  useEffect(()=>{
    init();
    sound.on('end', function(){
      canPlaySound.current = true
    });
    //cleanup
    return()=>{

    }
  },[])
  return (
    <div className={`main ${touched ? 'touched' : '' }`}>
      <video ref={video} className="video" autoPlay />

      <div className="control">
        <button className="btn" onClick={()=>train(NOT_TOUCH_LABLE)}>Train 1</button>
        <button className="btn" onClick={()=>train(TOUCHED_LABLE)}>Train 2</button>
        <button className="btn" onClick={()=>run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
