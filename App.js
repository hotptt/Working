// App.js
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";

const STORAGE_KEY = "TASKS_V2";

// 탭: 단기/정보/장기/완료
const CATS = [
  { key: "short", label: "단기" },
  { key: "info", label: "정보" },
  { key: "long", label: "장기" },
  { key: "done", label: "완료" },
];

const LABEL = { short: "단기", info: "정보", long: "장기" };

// 날짜 포맷
const fmtDate = (ts) => {
  const d = new Date(ts);
  let h = d.getHours();
  const ampm = h >= 12 ? "오후" : "오전";
  h = h % 12 || 12;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}. ${mm}. ${dd}. ${ampm} ${String(h).padStart(2, "0")}:${mi}`;
};

/* ------------------------- 작은 컴포넌트: 스텝 입력 ------------------------- */
const AddStepInput = memo(function AddStepInput({ onSubmit }) {
  const [txt, setTxt] = useState("");
  const fire = () => {
    const v = txt.trim();
    if (!v) return;
    onSubmit(v);
    setTxt("");
  };
  return (
    <View style={{ flexDirection: "row", marginTop: 10 }}>
      <TextInput
        value={txt}
        onChangeText={setTxt}
        placeholder="스텝 추가"
        placeholderTextColor="#6b7280"
        style={{
          flex: 1,
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
        }}
        returnKeyType="done"
        onSubmitEditing={fire}
      />
      <TouchableOpacity
        onPress={fire}
        style={{
          backgroundColor: "#475569",
          paddingHorizontal: 14,
          borderRadius: 10,
          marginLeft: 8,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>추가</Text>
      </TouchableOpacity>
    </View>
  );
});

/* ------------------------- 카드 컴포넌트 ------------------------- */
const TaskItem = memo(function TaskItem({ item, onOpen, onDone, onRemove }) {
  const doneCnt = (item.checklist?.filter((s) => s.done).length) ?? 0;
  const totalCnt = (item.checklist?.length) ?? 0;

  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#1e293b",
      }}
    >
      {/* 상단: 왼쪽 파랑점 + 제목 + 화살표 */}
      <TouchableOpacity
        onPress={() => onOpen(item)}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: "#3b82f6",
            marginRight: 8,
          }}
        />
        <Text
          style={{
            flex: 1,
            color: "white",
            fontSize: 18,
            fontWeight: "700",
          }}
          numberOfLines={1}
        >
          {item.text}
        </Text>
        <Feather name="chevron-right" size={22} color="#8b9bb0" />
      </TouchableOpacity>

      {/* 중간: 날짜 • 스텝 */}
      <Text style={{ color: "#9ca3af", marginTop: 8, fontSize: 12 }}>
        {fmtDate(item.createdAt)} • 스텝 {doneCnt}/{totalCnt}
      </Text>

      {/* 하단: 완료 버튼 + 휴지통 */}
      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => onDone(item.id)}
          style={{
            backgroundColor: "#22c55e",
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {item.done ? "취소" : "완료"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          style={{ marginLeft: 16 }}
        >
          <Feather name="trash-2" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

/* ------------------------- 메인 ------------------------- */
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [selectedCat, setSelectedCat] = useState("short"); // 기본: 단기
  const [modalTask, setModalTask] = useState(null);

  // 로컬 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // 저장 디바운스(I/O 절약)
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    }, 200);
    return () => clearTimeout(saveTimer.current);
  }, [tasks]);

  // 추가(기본 단기) + 상세 필드 기본값
  const addTask = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const t = {
      id: String(Date.now()),
      text,
      done: false,
      createdAt: Date.now(),
      category: "short",
      checklist: [], // [{ text, done }]
      memo: "",
    };
    setTasks((prev) => [t, ...prev]);
    setInput("");
    setSelectedCat("short");
  }, [input]);

  const openTask = useCallback((t) => setModalTask(t), []);
  const closeModal = useCallback(() => setModalTask(null), []);

  const toggleDone = useCallback((id) => {
    setTasks((prev) => {
      const before = prev.find((t) => t.id === id);
      const next = prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      );
      if (before && !before.done) setSelectedCat("done");
      return next;
    });
  }, []);

  const setCategory = useCallback(
    (id, cat) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, category: cat, done: false } : t
        )
      );
      setSelectedCat(cat);
      closeModal();
    },
    [closeModal]
  );

  const removeTask = useCallback(
    (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      closeModal();
    },
    [closeModal]
  );

  // 체크리스트 & 메모 조작
  const addStepToTask = useCallback((id, text) => {
    const v = text.trim();
    if (!v) return;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, checklist: [...(x.checklist ?? []), { text: v, done: false }] }
          : x
      )
    );
  }, []);

  const toggleStepDone = useCallback((id, idx) => {
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const list = [...(x.checklist ?? [])];
        list[idx] = { ...list[idx], done: !list[idx].done };
        return { ...x, checklist: list };
      })
    );
  }, []);

  const removeStep = useCallback((id, idx) => {
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const list = [...(x.checklist ?? [])];
        list.splice(idx, 1);
        return { ...x, checklist: list };
      })
    );
  }, []);

  const updateMemo = useCallback((id, text) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, memo: text } : x)));
  }, []);

  // 탭 필터
  const filtered = useMemo(() => {
    if (selectedCat === "done") return tasks.filter((t) => t.done);
    return tasks.filter((t) => !t.done && t.category === selectedCat);
  }, [tasks, selectedCat]);

  // 렌더러
  const renderItem = useCallback(
    ({ item }) => (
      <TaskItem
        item={item}
        onOpen={openTask}
        onDone={toggleDone}
        onRemove={removeTask}
      />
    ),
    [openTask, toggleDone, removeTask]
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#000" }}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* 상태바 표시 */}
      <StatusBar style="light" />

      {/* 헤더 + 탭 */}
      <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
            원하는-일 처리기
          </Text>

          <View style={{ flexDirection: "row" }}>
            {CATS.map((c, idx) => (
              <Pressable
                key={c.key}
                onPress={() => setSelectedCat(c.key)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor:
                    selectedCat === c.key ? "#111827" : "#1f2937",
                  marginLeft: idx === 0 ? 0 : 8,
                }}
              >
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 12 }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* 입력 */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ paddingHorizontal: 18, flexDirection: "row" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="무엇을 추가할까?"
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              backgroundColor: "#111827",
              color: "white",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
            }}
            returnKeyType="done"
            onSubmitEditing={addTask}
          />
          <TouchableOpacity
            onPress={addTask}
            style={{
              backgroundColor: "#22c55e",
              paddingHorizontal: 16,
              borderRadius: 14,
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <Feather name="plus" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 리스트 */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 10 }}>
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: "#9ca3af", marginTop: 30, textAlign: "center" }}>
              {selectedCat === "done"
                ? "완료한 항목이 없어요."
                : "이 카테고리에 항목이 없어요."}
            </Text>
          }
        />
      </View>

      {/* 상세 모달 */}
      <Modal
        visible={!!modalTask}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#0b0b0b",
              padding: 18,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            {modalTask && (
              <>
                {/* 상단: 제목 + 완료/분류 버튼 */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
                    항목 상세
                  </Text>

                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() => {
                        toggleDone(modalTask.id);
                        closeModal();
                      }}
                      style={{
                        backgroundColor: "#22c55e",
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "800" }}>
                        {modalTask.done ? "취소" : "완료"}
                      </Text>
                    </TouchableOpacity>

                    {["short", "info", "long"].map((k, idx) => (
                      <TouchableOpacity
                        key={k}
                        onPress={() => setCategory(modalTask.id, k)}
                        style={{
                          backgroundColor:
                            modalTask.category === k ? "#111827" : "#1f2937",
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "800" }}>
                          {LABEL[k]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 본문: 제목 박스 */}
                <View
                  style={{
                    marginTop: 14,
                    padding: 14,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 16 }}>
                    {modalTask.text}
                  </Text>
                  <Text style={{ color: "#9ca3af", marginTop: 6, fontSize: 12 }}>
                    상태: {modalTask.done ? "완료" : "진행중"} · 분류:{" "}
                    {modalTask.done ? "완료" : LABEL[modalTask.category] || "-"}
                  </Text>
                </View>

                {/* 체크리스트 */}
                <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginTop: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
                      체크리스트
                    </Text>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    {(modalTask.checklist ?? []).map((s, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => toggleStepDone(modalTask.id, idx)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: s.done ? "#22c55e" : "#334155",
                            backgroundColor: s.done ? "#22c55e" : "transparent",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 10,
                          }}
                        >
                          {s.done ? <Feather name="check" size={16} color="white" /> : null}
                        </Pressable>

                        <Text
                          style={{
                            flex: 1,
                            color: "white",
                            fontSize: 15,
                            textDecorationLine: s.done ? "line-through" : "none",
                            opacity: s.done ? 0.6 : 1,
                          }}
                        >
                          {s.text}
                        </Text>

                        <Pressable onPress={() => removeStep(modalTask.id, idx)}>
                          <Feather name="x" size={18} color="#94a3b8" />
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  <AddStepInput
                    onSubmit={(txt) => addStepToTask(modalTask.id, txt)}
                  />
                </View>

                {/* 메모 */}
                <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginTop: 14 }}>
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
                    메모
                  </Text>
                  <TextInput
                    value={modalTask.memo ?? ""}
                    onChangeText={(t) => updateMemo(modalTask.id, t)}
                    placeholder="생각을 던져 넣어라. 흐릿한 아이디어라도 기록하면 칼이 된다."
                    placeholderTextColor="#6b7280"
                    multiline
                    style={{
                      marginTop: 10,
                      minHeight: 90,
                      color: "white",
                      backgroundColor: "#111827",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      textAlignVertical: "top",
                      fontSize: 14,
                    }}
                  />
                </View>

                {/* 하단 버튼들 */}
                <View style={{ marginTop: 14, flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={() => removeTask(modalTask.id)}
                    style={{
                      backgroundColor: "#ef4444",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "800" }}>
                      이 항목 삭제
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={{
                      backgroundColor: "#374151",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      marginLeft: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "800" }}>
                      닫기
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}