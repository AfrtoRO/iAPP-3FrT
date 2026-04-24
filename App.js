import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, Modal, KeyboardAvoidingView, Platform,
  Animated, AppState, TouchableWithoutFeedback, Keyboard, Image, Dimensions, ActivityIndicator, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
// 🔴 التعديل السحري هنا: استخدام الـ legacy عشان المعرض والتيليجرام ميضربوش إيرور
import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#020202', card: '#0A0A0A', input: '#121212',
  primary: '#5D3FD3', text: '#FFFFFF', subText: '#8B949E',
  border: '#1A1A1A', danger: '#FF4757', success: '#2ED573', warning: '#FFA502'
};

const ENCRYPT_KEY = 11;
const encryptData = (dataObj) => JSON.stringify(dataObj).split('').map(c => (c.charCodeAt(0) + ENCRYPT_KEY).toString(16)).join('-');
const decryptData = (encryptedStr) => {
  try { return JSON.parse(encryptedStr.split('-').map(h => String.fromCharCode(parseInt(h, 16) - ENCRYPT_KEY)).join('')); }
  catch (e) { return []; }
};

const generateSecureName = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: 32}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const formatTime = (millis) => {
  if (!millis) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SecureMediaViewer = ({ media, onClose }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [status, setStatus] = useState({});
  const videoRef = useRef(null);

  if (media.type === 'photo' || media.type === 'image') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <Image source={{ uri: media.uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
        <TouchableOpacity style={[styles.vidControlBtn, { position: 'absolute', top: 50, right: 20 }]} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercent = status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Video 
        ref={videoRef}
        source={{ uri: media.uri }} 
        style={{ flex: 1 }} 
        useNativeControls={false} 
        resizeMode="contain" 
        shouldPlay={isPlaying} 
        isMuted={isMuted} 
        isLooping
        onPlaybackStatusUpdate={setStatus}
      />
      <View style={styles.customVideoControls}>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>
          <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} /></View>
          <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>
        </View>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.vidControlBtn} onPress={onClose}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
          <TouchableOpacity style={[styles.vidControlBtn, { width: 60, height: 60, borderRadius: 30 }]} onPress={() => setIsPlaying(!isPlaying)}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.vidControlBtn} onPress={() => setIsMuted(!isMuted)}><Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="#FFF" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
export default function CovertVaultFull() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authInput, setAuthInput] = useState('');
  
  const [media, setMedia] = useState([]);
  const [vaultTab, setVaultTab] = useState('media');
  const [activeMedia, setActiveMedia] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const [tgVideos, setTgVideos] = useState([]); 
  const [showTgModal, setShowTgModal] = useState(false);
  const [hasNewTgVideo, setHasNewTgVideo] = useState(false);
  const [tgLoadingIds, setTgLoadingIds] = useState({}); 
  const cloudAnim = useRef(new Animated.Value(0)).current;

  const VPS_API_URL = 'https://el3frt.io/bot';
  const TG_TOKEN = '5865244887:AAH41ra4rwB_hOFL-NF9jtBWr8u-YlrV764'; 

  useEffect(() => {
    loadEncryptedData();
    AsyncStorage.getItem('cv_tg_media_list').then(res => {
      if(res) {
        const parsed = JSON.parse(res);
        setTgVideos(parsed);
        if(parsed.length > 0) setHasNewTgVideo(true);
      }
    });
  }, []);

  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      fetchTelegramMedia();
      interval = setInterval(fetchTelegramMedia, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (hasNewTgVideo && !showTgModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cloudAnim, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(cloudAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      ).start();
    } else {
      cloudAnim.setValue(0);
      cloudAnim.stopAnimation();
    }
  }, [hasNewTgVideo, showTgModal]);

  const loadEncryptedData = async () => {
    const savedMedia = await AsyncStorage.getItem('cv_media_master');
    if (savedMedia) setMedia(decryptData(savedMedia));
  };

  const saveEncryptedMedia = async (data) => { 
    setMedia(data); 
    await AsyncStorage.setItem('cv_media_master', encryptData(data)); 
  };

  // 🔴 باسوورد الوقت شغال 100%
  const getExactPINs = () => {
    const now = new Date();
    const h = now.getHours(); const m = now.getMinutes();
    const h12 = h % 12 || 12;
    const padM = m < 10 ? '0' + m : m; const padH = h < 10 ? '0' + h : h;
    return [`${h12}${padM}`, `${h}${padM}`, `${padH}${padM}`];
  };

  const handleAuthChange = (text) => {
    setAuthInput(text);
    if (getExactPINs().includes(text)) { 
      Keyboard.dismiss(); 
      setIsLoggedIn(true);
      setAuthInput('');
    }
  };

  const fetchTelegramMedia = async () => {
    try {
      const res = await fetch(VPS_API_URL);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setTgVideos(prev => {
          const newItems = data.filter(serverItem => !prev.find(p => p.id === serverItem.id));
          if (newItems.length > 0) setHasNewTgVideo(true);
          const combined = [...newItems, ...prev];
          const unique = combined.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
          AsyncStorage.setItem('cv_tg_media_list', JSON.stringify(unique));
          return unique;
        });
      }
    } catch (e) {}
  };

  const downloadSingleTgMedia = async (itemObj) => {
    if (tgLoadingIds[itemObj.id]) return; 

    // 🔴 حماية من إيرور التيليجرام (الحد الأقصى 20 ميجا)
    const MAX_SIZE = 20 * 1024 * 1024; 
    if (itemObj.size > MAX_SIZE) {
      alert("Telegram Error: File exceeds 20MB Bot limit.");
      return;
    }

    try {
      setTgLoadingIds(prev => ({ ...prev, [itemObj.id]: true }));

      const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getFile?file_id=${itemObj.id}`);
      const data = await res.json();
      if (!data.ok) throw new Error("API Error from Telegram");
      
      const downloadUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${data.result.file_path}`;
      const originalExt = data.result.file_path.split('.').pop() || (itemObj.type === 'video' ? 'mp4' : 'jpg');
      const securePath = FileSystem.documentDirectory + generateSecureName() + '.' + originalExt;

      // 🔴 استخدام downloadAsync المباشرة للسرعة والضمان
      const { uri } = await FileSystem.downloadAsync(downloadUrl, securePath);
      
      if (uri) {
        setMedia(prev => {
          const updatedMedia = [{ id: Date.now().toString() + Math.random().toString(), uri: uri, type: itemObj.type, isFav: false, title: 'Channel Asset' }, ...prev];
          AsyncStorage.setItem('cv_media_master', encryptData(updatedMedia));
          return updatedMedia;
        });

        setTgVideos(prev => {
          const updated = prev.filter(v => v.id !== itemObj.id);
          AsyncStorage.setItem('cv_tg_media_list', JSON.stringify(updated));
          return updated;
        });
      }
      setTgLoadingIds(prev => { const upd = {...prev}; delete upd[itemObj.id]; return upd; });
    } catch(e) {
      alert("Download Failed: " + e.message);
      setTgLoadingIds(prev => { const upd = {...prev}; delete upd[itemObj.id]; return upd; });
    }
  };

  const downloadAllTgVideos = () => {
    if (tgVideos.length === 0) return;
    tgVideos.forEach(item => {
      if (!tgLoadingIds[item.id]) downloadSingleTgMedia(item);
    });
  };

  const pickMediaSecurely = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.All, 
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 1,
        copyToCacheDirectory: true 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems = [];
        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';
          const originalExt = asset.uri.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
          const securePath = FileSystem.documentDirectory + generateSecureName() + '.' + originalExt;
          
          // 🔴 استخدام copyAsync عشان ده ملف محلي مش رابط نت
          await FileSystem.copyAsync({
            from: asset.uri,
            to: securePath
          });
          
          newItems.push({ id: Date.now().toString() + Math.random().toString(), uri: securePath, type: isVideo ? 'video' : 'image', isFav: false, title: `Gallery Import` });
        }
        setMedia(prev => {
          const updated = [...newItems, ...prev];
          AsyncStorage.setItem('cv_media_master', encryptData(updated));
          return updated;
        });
      }
    } catch (error) { 
      alert("Gallery Error: " + error.message); 
    }
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const target = media.find(m => m.id === confirmDel.id);
    if (target) { try { await FileSystem.deleteAsync(target.uri); } catch (e) { } }
    setMedia(prev => { const upd = prev.filter(m => m.id !== confirmDel.id); AsyncStorage.setItem('cv_media_master', encryptData(upd)); return upd; });
    setConfirmDel(null);
  };
  if (!isLoggedIn) {
    return (
      <View style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Ionicons name="finger-print" size={80} color={COLORS.primary} style={{marginBottom: 30}} />
        <Text style={styles.vaultHeaderTitle}>Ghost Vault</Text>
        <Text style={{color: COLORS.subText, marginTop: 10, marginBottom: 30}}>Enter Secure PIN</Text>
        <TextInput 
          style={[styles.input, {width: '60%', textAlign: 'center', fontSize: 24, letterSpacing: 15, height: 60}]}
          placeholder="••••" placeholderTextColor="#333" secureTextEntry keyboardType="number-pad" maxLength={4} keyboardAppearance="dark"
          value={authInput} onChangeText={handleAuthChange}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View style={styles.vaultHeader}>
        <View>
          <Text style={styles.vaultHeaderTitle}>Ghost Vault</Text>
          <Text style={styles.vaultHeaderSub}>{vaultTab === 'links' ? '0 Links' : media.length + ' Media Assets'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={() => { setShowTgModal(true); setHasNewTgVideo(false); }}>
            <Animated.View style={{ transform: [{ translateY: cloudAnim }] }}>
              <Ionicons name={hasNewTgVideo ? "cloud-download" : "cloud-download-outline"} size={28} color={hasNewTgVideo ? COLORS.primary : COLORS.subText} />
              {tgVideos.length > 0 && <View style={styles.tgBadge}><Text style={styles.tgBadgeTxt}>{tgVideos.length}</Text></View>}
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: COLORS.danger + '20', borderColor: 'transparent' }]} onPress={() => setIsLoggedIn(false)}>
            <Ionicons name="lock-closed" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity style={[styles.tabBtn, vaultTab === 'links' && styles.tabBtnActive]} onPress={() => setVaultTab('links')}><Text style={[styles.tabTxt, vaultTab === 'links' && { color: COLORS.text }]}>Encrypted Links</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, vaultTab === 'media' && styles.tabBtnActive]} onPress={() => setVaultTab('media')}><Text style={[styles.tabTxt, vaultTab === 'media' && { color: COLORS.text }]}>Secure Media</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {/* صفحة الروابط ملغية ومجرد واجهة فقط للوقت الحالي */}
        {vaultTab === 'links' && (
          <View style={{alignItems: 'center', marginTop: 100}}>
            <Ionicons name="link-outline" size={60} color={COLORS.subText} style={{marginBottom: 20}} />
            <Text style={{color: COLORS.subText, fontSize: 16, fontWeight: 'bold'}}>Link Manager</Text>
            <Text style={{color: COLORS.subText, marginTop: 10}}>Reserved for future updates.</Text>
          </View>
        )}

        {vaultTab === 'media' && (
          <>
            <View style={styles.downloaderCard}>
              <Text style={styles.downloaderTitle}>Secure Asset Importer</Text>
              <TouchableOpacity style={styles.tgDownloadAllBtnLarge} onPress={pickMediaSecurely}>
                <Ionicons name="images" size={24} color="#FFF" />
                <Text style={styles.tgDownloadAllTxtLarge}>Import from Gallery (Multiple)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.vidGrid}>
              {media.map(m => (
                <View key={m.id} style={styles.vidWrapper}>
                  <TouchableOpacity style={styles.vidCard} onPress={() => setActiveMedia(m)}>
                    {m.type === 'image' || m.type === 'photo' ? (
                       <Image source={{ uri: m.uri }} style={styles.vidThumb} resizeMode="cover" />
                    ) : (
                       <Video source={{ uri: m.uri }} style={styles.vidThumb} resizeMode="cover" shouldPlay={false} />
                    )}
                    <View style={styles.vidPlayOverlay}><Ionicons name={m.type === 'image' || m.type === 'photo' ? "image" : "play"} size={30} color="#FFF" /></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vidDelBtn} onPress={() => setConfirmDel({ type: 'media', id: m.id })}><Ionicons name="trash" size={14} color="#FFF" /></TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal visible={showTgModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalCard, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="albums-outline" size={24} color={COLORS.text} style={{marginRight: 10}} /><Text style={styles.modalTitle}>Channel Inbox</Text></View>
              <TouchableOpacity onPress={() => setShowTgModal(false)}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={downloadAllTgVideos} style={styles.tgDownloadAllBtnLarge}><Ionicons name="cloud-download-outline" size={24} color="#FFF" /><Text style={styles.tgDownloadAllTxtLarge}>Download All Media</Text></TouchableOpacity>
            <FlatList
                data={tgVideos}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => {
                  const isLoading = tgLoadingIds[item.id];
                  return (
                    <View style={styles.tgVidCard}>
                      <View style={styles.tgVidInfoRow}>
                        <View style={styles.tgVidIconBox}><Ionicons name={item.type === 'video' ? "videocam" : "image"} size={24} color={COLORS.subText} /></View>
                        <View style={{flex: 1}}><Text style={styles.linkTitle} numberOfLines={1}>Channel Asset</Text><Text style={styles.linkUrl}>{formatBytes(item.size)}</Text></View>
                        <TouchableOpacity style={[styles.tgDownloadBtn, isLoading && {backgroundColor: 'transparent'}]} onPress={() => downloadSingleTgMedia(item)} disabled={isLoading}>
                          {isLoading ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="download" size={20} color="#FFF" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                }}
                contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={{color: COLORS.subText, textAlign: 'center'}}>No media found in Channel.</Text>}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {activeMedia && (
        <Modal visible={true} transparent>
          <SecureMediaViewer media={activeMedia} onClose={() => setActiveMedia(null)} />
        </Modal>
      )}

      <Modal visible={!!confirmDel} transparent animationType="fade">
        <View style={styles.modalOverlayCen}>
          <View style={styles.confirmCard}>
            <Ionicons name="warning" size={55} color={COLORS.danger} style={{ marginBottom: 15 }} />
            <Text style={styles.confirmTitle}>Purge Asset?</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 25 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDel(null)}><Text style={styles.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={executeDelete}><Text style={styles.delBtnTxt}>Purge</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  vaultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 40, paddingBottom: 10 },
  vaultHeaderTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  vaultHeaderSub: { fontSize: 14, color: COLORS.primary, fontWeight: '800', marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tabSwitcher: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, backgroundColor: COLORS.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: COLORS.bg },
  tabTxt: { color: COLORS.subText, fontWeight: '800', fontSize: 14 },
  listContainer: { flex: 1, padding: 20 },
  input: { backgroundColor: COLORS.input, borderRadius: 15, color: '#FFF', padding: 15, borderWidth: 1, borderColor: COLORS.border },
  downloaderCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  downloaderTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900', marginBottom: 15 },
  vidGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  vidWrapper: { width: (width - 55) / 2, aspectRatio: 1, marginBottom: 15 },
  vidCard: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  vidThumb: { width: '100%', height: '100%' },
  vidPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  vidDelBtn: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  modalOverlayCen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 28, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  confirmTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginBottom: 10 },
  cancelBtn: { flex: 1, height: 55, backgroundColor: COLORS.bg, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cancelBtnTxt: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  delBtn: { flex: 1, height: 55, backgroundColor: COLORS.danger, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  delBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  tgBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.danger, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  tgBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  tgDownloadAllBtnLarge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 16, justifyContent: 'center', marginBottom: 10 },
  tgDownloadAllTxtLarge: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  tgVidCard: { backgroundColor: COLORS.bg, borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  tgVidInfoRow: { flexDirection: 'row', alignItems: 'center' },
  tgVidIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  linkTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
  linkUrl: { color: COLORS.subText, fontSize: 12, fontWeight: '600' },
  tgDownloadBtn: { width: 45, height: 45, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  customVideoControls: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  timeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  progressBarBg: { flex: 1, height: 20, justifyContent: 'center' },
  progressBarFill: { height: 6, backgroundColor: COLORS.success, borderRadius: 3 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vidControlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
});
