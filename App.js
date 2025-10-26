import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  FlatList, Modal, Alert, KeyboardAvoidingView, ScrollView,
  useWindowDimensions, StatusBar, Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

// ---------- Util ----------
const uid = () => Math.random().toString(36).slice(2);
const now = () => Date.now();
const STORAGE_KEY = "desires_v1_mobile";

// ---------- Storage ----------
async function loadDesires() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveDesires(data) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- Mock Agent ----------
function agentAssist(title) {
  const t = (title || "").toLowerCase();
  const steps = [];

  if (/(앱|app|프로토타입|prototype)/.test(t)) {
    steps.push(
      { id: uid(), text: "문제 정의 한 줄로 요약", done: false, source: "agent" },
      { id: uid(), text: "MVP 기능 3개만 선정", done: false, source: "agent" },
      { id: uid(), text: "와이어프레임(종이/피그마) 30분", done: false, source: "agent" },
      { id: uid(), text: "단일 화면부터 코딩 시작", done: false, source: "agent" }
    );
  }
  if (/(영어|english|토익|toeic)/.test(t)) {
    steps.push(
      { id: uid(), text: "현재 레벨 측정(모의/단어)", done: false, source: "agent" },
      { id: uid(), text: "목표 점수/기간 확정", done: false, source: "agent" },
      { id: uid(), text: "매일 30분(단어/리스닝)", done: false, source: "agent" }
    );
  }
  if (/(운동|헬스|체지방|런닝|러닝|달리기)/.test(t)) {
    steps.push(
      { id: uid(), text: "주 3회 20분 일정 고정", done: false, source: "agent" },
      { id: uid(), text: "첫 주 목표: 2회 완료", done: false, source: "agent" },
      { id: uid(), text: "기록(시간/체감난이도)", done: false, source: "agent" }
    );
  }
  if (steps.length === 0) {
    steps.push(
      { id: uid(), text: "한 줄 요약 작성", done: false, source: "agent" },
      { id: uid(), text: "성공 조건 1개 정의", done: false, source: "agent" },
      { id: uid(), text: "첫 15분 행동 1개", done: false, source: "agent" }
    );
  }

  return { steps };
}

// ---------- App ----------
export default function App() {
  const [desires, setDesires] = useState([]);
  const [draft, setDraft] = useState("");
  // 필터는 진행중/완료만
  const [filter, setFilter] = useState("active"); // "active" | "done"
  const [focus, setFocus] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const stepInputRef = useRef(null);
  const [stepDraft, setStepDraft] = useState("");

  // S24 대응 스케일
  const { width, height } = useWindowDimensions();
  const isSmall = width < 380;
  const isTall = height > 760;
  const basePad = isSmall ? 12 : 16;
  const baseFont = isSmall ? 13 : 14;
  const titleFont = isSmall ? 18 : 20;

  // 데이터 로드/저장
  useEffect(() => { loadDesires().then(setDesires); }, []);
  useEffect(() => { saveDesires(desires); }, [desires]);

  // 상단바(시간/배터리) 숨김 — Android에서 전체화면
  // iOS는 정책상 완전 숨김이 제한적이므로 그대로 둔다.
  const statusBarHidden = Platform.OS === "android";

  const filtered = useMemo(() => {
    return desires.filter(d => (filter === "active" ? d.status !== "done" : d.status === "done"));
  }, [desires, filter]);

  const addDesire = () => {
    const title = draft.trim();
    if (!title) return;
    const d = { id: uid(), title, createdAt: now(), status: "active", steps: [], notes: "" };
    setDesires(prev => [d, ...prev]);
    setDraft("");
  };

  const openDesire = (d) => { setFocus(d); setModalOpen(true); };

  // 완료/되돌리기만 제공
  const markDone = (id) => {
    setDesires(prev => prev.map(d => d.id === id ? { ...d, status: "done" } : d));
    if (focus && focus.id === id) setFocus({ ...focus, status: "done" });
  };
  const markActive = (id) => {
    setDesires(prev => prev.map(d => d.id === id ? { ...d, status: "active" } : d));
    if (focus && focus.id === id) setFocus({ ...focus, status: "active" });
  };

  const removeDesire = (id) => {
    setDesires(prev => prev.filter(d => d.id !== id));
    if (focus?.id === id) { setModalOpen(false); setFocus(null); }
  };

  const toggleStep = (desireId, stepId) => {
    setDesires(prev => prev.map(d => d.id !== desireId ? d : {
      ...d,
      steps: d.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s)
    }));
    if (focus?.id === desireId) {
      const updated = {
        ...focus,
        steps: focus.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s)
      };
      setFocus(updated);
    }
  };

  const addStep = (desireId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const step = { id: uid(), text: trimmed, done: false, source: "user" };
    setDesires(prev => prev.map(d => d.id === desireId ? { ...d, steps: [...d.steps, step] } : d));
    if (focus?.id === desireId) setFocus({ ...focus, steps: [...focus.steps, step] });
    setStepDraft("");
    if (stepInputRef.current) stepInputRef.current.clear();
  };

  const addAgentHelp = (desireId) => {
    const d = desires.find(x => x.id === desireId);
    if (!d) return;
    const result = agentAssist(d.title);
    const exists = new Set(d.steps.map(s => s.text));
    const merged = [...d.steps];
    result.steps.forEach(s => { if (!exists.has(s.text)) merged.push(s); });
    const updated = desires.map(x => x.id !== desireId ? x : { ...x, steps: merged });
    setDesires(updated);
    if (focus?.id === desireId) setFocus({ ...d, steps: merged });
    Alert.alert("AI 제안 완료", "체크리스트가 추가됐어. 필요 없는 건 길게 눌러 지워.");
  };

  const removeStep = (desireId, stepId) => {
    setDesires(prev => prev.map(d => d.id === desireId ? { ...d, steps: d.steps.filter(s => s.id !== stepId) } : d));
    if (focus?.id === desireId) setFocus({ ...focus, steps: focus.steps.filter(s => s.id !== stepId) });
  };

  // ---------- UI ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* 상단 상태바 숨김 */}
      <StatusBar hidden={statusBarHidden} />

      {/* Header */}
      <View style={{ padding: basePad, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Feather name="zap" size={20} color="#e2e8f0" />
          <Text style={{ fontSize: titleFont, fontWeight: "700", color: "#f8fafc", marginLeft: 8 }}>
            원하는-일 처리기
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          {["active", "done"].map(k => (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={{
                paddingVertical: isSmall ? 6 : 7,
                paddingHorizontal: isSmall ? 9 : 10,
                borderRadius: 14,
                backgroundColor: filter === k ? "#0f172a" : "#111827",
                marginLeft: isSmall ? 4 : 6,
                borderWidth: 1,
                borderColor: "#1f2937"
              }}
            >
              <Text style={{ color: filter === k ? "white" : "#e5e7eb", fontSize: isSmall ? 11 : 12 }}>
                {k === "active" ? "진행중" : "완료"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input */}
      <View style={{ paddingHorizontal: basePad }}>
        <View style={{ flexDirection: "row" }}>
          <TextInput
            placeholder="예: 앱 프로토타입 / 체지방 15% / 영어 리스닝 20분"
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addDesire}
            style={{
              flex: 1, backgroundColor: "#111827", borderRadius: 12,
              paddingHorizontal: isSmall ? 10 : 12, paddingVertical: isSmall ? 8 : 10,
              borderWidth: 1, borderColor: "#1f2937", color: "#f8fafc", fontSize: baseFont
            }}
          />
          <TouchableOpacity
            onPress={addDesire}
            style={{
              backgroundColor: "#0f172a",
              paddingHorizontal: isSmall ? 12 : 14,
              borderRadius: 12, justifyContent: "center",
              marginLeft: isSmall ? 6 : 8
            }}
          >
            <Feather name="plus" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: basePad, paddingBottom: basePad + 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openDesire(item)}
            style={{
              backgroundColor: "#0b1220", borderRadius: 16, padding: 12,
              borderWidth: 1, borderColor: "#111827"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 8 }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 999,
                  backgroundColor: item.status === "done" ? "#10b981" : "#3b82f6"
                }} />
                <Text style={{ color: "#e5e7eb", fontWeight: "600", marginLeft: 8, fontSize: isSmall ? 14 : 16 }}>
                  {item.title}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#9ca3af" />
            </View>
            <Text style={{ color: "#9ca3af", fontSize: isSmall ? 11 : 12, marginTop: 6 }}>
              {new Date(item.createdAt).toLocaleString()} • 스텝 {item.steps.filter(s => s.done).length}/{item.steps.length}
            </Text>
            {/* 완료/되돌리기 */}
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              {item.status !== "done" ? (
                <TouchableOpacity onPress={() => markDone(item.id)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#10b981", borderRadius: 10, marginRight: 6 }}>
                  <Text style={{ color: "white", fontSize: isSmall ? 11 : 12 }}>완료</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => markActive(item.id)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#374151", borderRadius: 10, marginRight: 6 }}>
                  <Text style={{ color: "white", fontSize: isSmall ? 11 : 12 }}>되돌리기</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => removeDesire(item.id)} style={{ paddingHorizontal: 8, justifyContent: "center" }}>
                <Feather name="trash-2" size={18} color="#e5e7eb" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#94a3b8", marginTop: 40 }}>
            아직 없다. 적어. 손이 머리를 이긴다.
          </Text>
        }
      />

      {/* Detail Modal */}
      {focus && (
        <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <StatusBar hidden={statusBarHidden} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: basePad, borderBottomWidth: 1, borderColor: "#111827" }}>
              <Text style={{ fontWeight: "700", fontSize: isSmall ? 17 : 18, color: "#f8fafc" }} numberOfLines={1}>
                {focus.title}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Feather name="x" size={22} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <ScrollView
                contentContainerStyle={{ padding: basePad, paddingBottom: (isTall ? basePad + 60 : basePad + 40) }}
                keyboardShouldPersistTaps="handled"
              >
                {/* 완료/되돌리기 */}
                <View style={{ flexDirection: "row" }}>
                  {focus.status !== "done" ? (
                    <TouchableOpacity onPress={() => markDone(focus.id)}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#10b981", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 }}>
                      <Feather name="check" size={16} color="white" />
                      <Text style={{ color: "white", marginLeft: 6, fontSize: baseFont }}>완료</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => markActive(focus.id)}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#374151", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 }}>
                      <Feather name="corner-up-left" size={16} color="white" />
                      <Text style={{ color: "white", marginLeft: 6, fontSize: baseFont }}>되돌리기</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 체크리스트 */}
                <View style={{ marginTop: 16, borderWidth: 1, borderColor: "#111827", borderRadius: 14, padding: 12, backgroundColor: "#0b1220" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "600", fontSize: baseFont + 1, color: "#f8fafc" }}>체크리스트</Text>
                    <TouchableOpacity onPress={() => addAgentHelp(focus.id)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                      <Feather name="sparkles" size={14} color="white" />
                      <Text style={{ color: "white", marginLeft: 6, fontSize: isSmall ? 11 : 12 }}>도와줘</Text>
                    </TouchableOpacity>
                  </View>

                  {focus.steps.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => toggleStep(focus.id, s.id)}
                      onLongPress={() => removeStep(focus.id, s.id)}
                      style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
                    >
                      <Feather name={s.done ? "check-square" : "square"} size={18} color={s.done ? "#10b981" : "#e5e7eb"} />
                      <Text style={{
                        marginLeft: 8, color: s.done ? "#94a3b8" : "#e5e7eb",
                        textDecorationLine: s.done ? "line-through" : "none",
                        fontSize: baseFont
                      }}>
                        {s.text}{s.source === "agent" ? " (AI)" : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <View style={{ flexDirection: "row", marginTop: 12 }}>
                    <TextInput
                      ref={stepInputRef}
                      placeholder="스텝 추가"
                      placeholderTextColor="#94a3b8"
                      value={stepDraft}
                      onChangeText={setStepDraft}
                      onSubmitEditing={() => addStep(focus.id, stepDraft)}
                      style={{
                        flex: 1, borderWidth: 1, borderColor: "#1f2937", borderRadius: 10,
                        paddingHorizontal: isSmall ? 8 : 10, paddingVertical: isSmall ? 6 : 8, color: "#f8fafc", fontSize: baseFont,
                        backgroundColor: "#0f172a"
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => addStep(focus.id, stepDraft)}
                      style={{ borderWidth: 1, borderColor: "#374151", borderRadius: 10, paddingHorizontal: 12, justifyContent: "center", marginLeft: isSmall ? 6 : 8 }}
                    >
                      <Text style={{ color: "#e5e7eb", fontSize: baseFont }}>추가</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 메모 */}
                <View style={{ marginTop: 16, borderWidth: 1, borderColor: "#111827", borderRadius: 14, padding: 12, backgroundColor: "#0b1220" }}>
                  <Text style={{ fontWeight: "600", fontSize: baseFont + 1, color: "#f8fafc" }}>메모</Text>
                  <TextInput
                    multiline
                    placeholder="생각을 던져 넣어라. 흐릿한 아이디어도 기록하면 칼이 된다."
                    placeholderTextColor="#94a3b8"
                    value={focus.notes ?? ""}
                    onChangeText={(txt) => {
                      setDesires(prev => prev.map(d => d.id === focus.id ? { ...d, notes: txt } : d));
                      setFocus({ ...focus, notes: txt });
                    }}
                    style={{
                      marginTop: 8, minHeight: 120, borderWidth: 1, borderColor: "#1f2937", borderRadius: 10,
                      padding: 10, color: "#f8fafc", textAlignVertical: "top", fontSize: baseFont, backgroundColor: "#0f172a"
                    }}
                  />
                </View>

                {/* 삭제 */}
                <TouchableOpacity onPress={() => removeDesire(focus.id)} style={{ marginTop: 20, alignSelf: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#fee2e2" }}>
                  <Text style={{ color: "#991b1b", fontSize: baseFont }}>이 항목 삭제</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}

      <Text style={{ textAlign: "center", color: "#9ca3af", marginBottom: 12, fontSize: baseFont }}>
        "적었다면 움직여라." — Shut up, Show up.
      </Text>
    </SafeAreaView>
  );
}