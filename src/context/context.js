import { createContext, useEffect, useState } from 'react';
import useFetch from '../hooks/ajax'
import axios from 'axios';
import * as Tone from 'tone';
import { BASS, CHORDS } from '../lib/noteInfo';
import { SYNTHS, synthTypes } from '../lib/synthInfo';
import { message } from 'antd';

export const Context = createContext();

function ContextProvider(props) {
  const [prog, setProg] = useState(['I', 'V', 'vi', 'IV'])
  const [tempo, setTempo] = useState(120);
  const [title, setTitle] = useState('New Song')
  const [noteSwitches, setNoteSwitches] = useState({});
  const [buttons, setButtons] = useState({})


  const [loopLength, setLoopLength] = useState(12);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState('');
  const [songs, setSongs] = useState([]);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [openSongId, setOpenSongId] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [playStatus, setPlayStatus] = useState('stop');

  const fetchApi = useFetch();

  const makeSynth = type => new Tone[synthTypes[type]](SYNTHS[type]).toDestination();

  const NOTES = {
    high: [CHORDS[prog[0]][2], CHORDS[prog[1]][2], CHORDS[prog[2]][2], CHORDS[prog[3]][2]],
    mid: [CHORDS[prog[0]][1], CHORDS[prog[1]][1], CHORDS[prog[2]][1], CHORDS[prog[3]][1]],
    low: [CHORDS[prog[0]][0], CHORDS[prog[1]][0], CHORDS[prog[2]][0], CHORDS[prog[3]][0]],
    bassHigh: [BASS[prog[0]][1], BASS[prog[1]][1], BASS[prog[2]][1], BASS[prog[3]][1]],
    bassLow: [BASS[prog[0]][0], BASS[prog[1]][0], BASS[prog[2]][0], BASS[prog[3]][0]],
    cymbal: ['C1', 'C1', 'C1', 'C1'],
    snareDrum: ['S', 'S', 'S', 'S'],
    bassDrum: ['C1', 'C1', 'C1', 'C1'],
  }

  useEffect(() => {

    const checkLoggedIn = async () => {
      const result = await axios.get(process.env.REACT_APP_URL + '/api/v1/loggedIn')

      if (result.data) {
        setSongs(result.data.songList);
        setUser(result.data.username);
        setLoggedIn(true);
      }
    }
    checkLoggedIn();

  }, []);

  useEffect(() => {

    const noteObj = {};
    const buttonObj = {};
    ['high', 'mid', 'low', 'bassHigh', 'bassLow', 'cymbal', 'snareDrum', 'bassDrum'].forEach(row => {
      let type;
      if (['bassHigh', 'bassLow'].includes(row)) type = 'bassSynth'
      else if (['high', 'mid', 'low'].includes(row)) type = 'chordSynth'
      else type = row;
      const synth = makeSynth(type);
      buttonObj[row] = new Array(loopLength).fill(false);
      noteObj[row] = new Tone.Sequence((time, note) => {
        if (type === 'snareDrum') synth.triggerAttackRelease('16n', time)
        else synth.triggerAttackRelease(note, '8n', time)
      }, new Array(loopLength).fill([])).start(0);
    })
    setNoteSwitches(noteObj)
    setButtons(buttonObj)

    const loop = new Tone.Loop(time => {
      Tone.Draw.schedule(() => {
        setCurrentBeat(beat => (beat + 1) % loopLength)
      }, time)
    }, '8n').start(0);

    return () => {
      loop.cancel();
      loop.dispose();
      for (let row in noteObj) {
        noteObj[row].cancel();
        noteObj[row].dispose();
      }
    }
  }, [loopLength])

  const signIn = async (userData) => {
    const result = await fetchApi('/signin', 'post', userData)

    if (!result.error) {
      setLoggedIn(true)
      setUser(result.data.username);
      setSongs(result.data.songs);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const signUp = async (userData) => {
    const result = await fetchApi('/signup', 'post', userData);
    if (!result.error) {
      setLoggedIn(true)
      setUser(userData.username);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const logout = async () => {
    const result = await fetchApi('/logout', 'get')
    if (!result.error) {
      setLoggedIn(false)
      setUser('')
      setSongs([])
      setOpenSongId(false)
      setTitle('New Song')
      reset();
      handleTempoChange(120);
      setLoopLength(12)
      setProg(['I', 'V', 'vi', 'IV']);
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  /**
   * @param {String} type Should be 'new' or 'update'
   */
  const saveSong = async (type, newTitle) => {

    const songObj = {
      title: newTitle || title,
      buttonsPressed: buttons,
      bpm: tempo,
      numberOfBeats: loopLength,
      chordProgression: prog,
    }
    const result = await fetchApi(
      type === 'update' ? '/update' : '/save',
      type === 'update' ? 'put' : 'post',
      songObj)

    if (!result.error) {
      if (type === 'new') {
        setSongs(arr => [...arr, result.data])
        setOpenSongId(result.data.id)
        setTitle(result.data.title)
      }
      message.success(`${result.data.title} successfully saved`)
      return 'success'
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const newSong = async () => {
    const result = await fetchApi('/close', 'get')
    if (!result.error) {
      reset();
      setOpenSongId(false);
      handleTempoChange(120);
      setProg(['I', 'V', 'vi', 'IV']);
      const titles = songs.map(({ title }) => title)
      let newTitle = 'New Song'
      let i = 1;
      while (titles.includes(newTitle)) {
        newTitle = `New Song ${i}`;
        i++;
      }

      setTitle(newTitle);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }

  }

  const open = async (songId) => {

    reset(true);
    const result = await fetchApi('/open', 'post', { songId })
    if (!result.error) {
      
      const { data: songObj } = result
      setProg(songObj.chordProgression);
      handleTempoChange(songObj.bpm)
      setLoopLength(songObj.numberOfBeats);
      setTitle(songObj.title)
      setOpenSongId(songObj._id)
      setButtons({...songObj.buttonsPressed})
      setNoteSwitches(updateButtons(songObj));
      setCurrentBeat(-1)

      return 'success'
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const handleChordChange = (newChord, i) => {
    setProg(arr => {
      const arrCopy = [...arr]
      arrCopy[i] = newChord;
      return arrCopy;
    });

    const start = i * loopLength / 4;
    const end = start + loopLength / 4
    const noteRows = ['high', 'mid', 'low', 'bassHigh', 'bassLow']
    noteRows.forEach(noteRow => {
      for (let i = start; i < end; i++) {
        if (noteSwitches[noteRow].events[i].length) {

          let note;
          if (['bassLow', 'bassHigh'].includes(noteRow)) {
            note = BASS[newChord][noteRow === 'bassLow' ? 0 : 1] + 3;
          } else {
            note = CHORDS[newChord][2 - Object.keys(NOTES).indexOf(noteRow)] + 5;
          }
          noteSwitches[noteRow].events[i] = note;

        }
      }
    })
  }

  const rename = async newTitle => {
    if (songs.length) {
      let songInList = songs.filter(({ title: titleInList }) => titleInList === title)
      if (songInList.length) {
        const { id: songId } = songInList[0];
        const result = await fetchApi('/rename', 'patch', { newTitle, songId });
        if (result.error) {
          message.error(result.message)
          return 'error';
        } else {
          setTitle(result.data.newTitle)
          setSongs(songs => {
            return [...songs.map((song, { id }) => {
              if (id === songId) {
                return { id, title: newTitle }
              }
              else return song;
            })];
          })
        }
      } else {
        setTitle(newTitle);
      }
    } else {
      setTitle(newTitle);
    }

  }

  const deleteSong = async () => {
    const result = await fetchApi('/deletesong', 'delete', {
      songIdToDelete: openSongId
    })
    if (!result.error) {
      reset();
      setSongs(arr => arr.filter(({ id }) => id !== openSongId))
      setOpenSongId(false);
      setTitle('New Song');
      handleTempoChange(120);

      setProg(['I', 'V', 'vi', 'IV']);
      message.success(`${result.data.title} successfullly deleted`)
      return 'success';
    } else {
      message.error(result.message)
      return 'error'
    }
  }

  const updateButtons = ({ chordProgression, buttonsPressed, numberOfBeats }) => {
    const numPerChord = numberOfBeats / 4;
    let chord = 0;
    let counter = 0
    for (let noteRow in buttonsPressed) {
      const arrLoop = new Array(numberOfBeats).fill([])
      for (let i = 0; i < numberOfBeats; i++) {
        if (buttonsPressed[noteRow][i]) {

          let note;
          if (['bassDrum', 'snareDrum', 'cymbal'].includes(noteRow)) {
            note = NOTES[noteRow][0];
          } else if (['bassLow', 'bassHigh'].includes(noteRow)) {
            note = BASS[chordProgression[chord]][noteRow === 'bassLow' ? 0 : 1] + 3;
          } else {
            note = CHORDS[chordProgression[chord]][2 - Object.keys(NOTES).indexOf(noteRow)] + 5;
          }

          arrLoop[i] = note;
        }
        counter++;
        if (counter >= numPerChord) {
          chord++;
          counter = 0;
        }
      }

      let type;
      if (['bassHigh', 'bassLow'].includes(noteRow)) type = 'bassSynth'
      else if (['high', 'mid', 'low'].includes(noteRow)) type = 'chordSynth'
      else type = noteRow;

      const synth = makeSynth(type);
      buttonsPressed[noteRow] = new Tone.Sequence((time, note) => {
        if (type === 'snareDrum') synth.triggerAttackRelease('8n', time)
        else synth.triggerAttackRelease(note, '8n', time)
      }, arrLoop).start(0);

      chord = 0;
      counter = 0;
    }

    return buttonsPressed;
  }

  const handleTempoChange = newTempo => {
    const tempo = newTempo < 50 ? 50 : Math.min(320, newTempo)
    Tone.Transport.bpm.rampTo(tempo);
    setTempo(tempo)
  }

  const reset = async (skip) => {
    await Tone.Transport.stop('+8n');
    const buttonObj = {};
    for (let noteRow in noteSwitches) {
      noteSwitches[noteRow].dispose()
      buttonObj[noteRow] = new Array(loopLength).fill(false);
    }

    setButtons(buttonObj)

    if (!skip) {

      const noteObj = {};

      ['high', 'mid', 'low', 'bassHigh', 'bassLow', 'cymbal', 'snareDrum', 'bassDrum'].forEach(row => {
        let type;
        if (['bassHigh', 'bassLow'].includes(row)) type = 'bassSynth'
        else if (['high', 'mid', 'low'].includes(row)) type = 'chordSynth'
        else type = row;
        const synth = makeSynth(type);

        noteObj[row] = new Tone.Sequence((time, note) => {
          if (type === 'snareDrum') synth.triggerAttackRelease('8n', time)
          else synth.triggerAttackRelease(note, '8n', time)
        }, new Array(loopLength).fill([])).start(0);
      })

      setNoteSwitches(noteObj)
    }

    setPlayStatus('stop')
    setCurrentBeat(-2)
  }

  const stopAudio = () => {
    Tone.Transport.stop('+8n')
    setPlayStatus('stop')
    setCurrentBeat(-2);
  }

  const state = {
    loggedIn,
    signIn,
    signUp,
    logout,
    saveSong,
    songs,
    user,
    noteSwitches,
    setNoteSwitches,
    prog,
    setProg,
    loopLength,
    setLoopLength,
    tempo,
    setTempo,
    open,
    handleTempoChange,
    Tone,
    title,
    setTitle,
    currentBeat,
    setCurrentBeat,
    reset,
    NOTES,
    makeSynth,
    rename,
    openSongId,
    deleteSong,
    newSong,
    showForm,
    setShowForm,
    playStatus,
    setPlayStatus,
    handleChordChange,
    buttons,
    setButtons,
    stopAudio
  }

  return (
    <Context.Provider value={state}>
      {props.children}
    </Context.Provider>
  )
}
export default ContextProvider;
