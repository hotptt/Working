// App.js
import React, {
  useEffect, useMemo, useState, useCallback, useRef, memo,
} from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const STORAGE_KEY = "TASKS_V2";

const CATS = [
  { key: "short", label: "단기" },
  { key: "info",  label: "정보" },
  { key: "long",  label: "장기" },
  { key: "done",  label: "완료" },
];
const LABEL = { short: "단기", info: "정보", long: "장기" };

const fmtDate = (ts) => {
  const d = new Date(ts);
  let h = d.getHours(); const ampm = h >= 12 ? "오후" : "오전"; h = h % 12 || 12;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}. ${mm}. ${dd}. ${ampm} ${String(h).padStart(2, "0")}:${mi}`;
};

/* 카드 */
const TaskCard = memo(function TaskCard({ item, onOpen, onDone, onRemove }) {
  const doneCnt  = (item.checklist?.filter(s => s.done).length) ?? 0;
  const totalCnt = (item.checklist?.length) ?? 0;

  return (
    <Pressable
      onPress={() => onOpen(item)}
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
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 8, height: 8, borderRadius: 999,
            backgroundColor: "#3b82f6", marginRight: 8,
          }}
        />
        <Text
          style={{ flex: 1, color: "white", fontSize: 18, fontWeight: "700" }}
          numberOfLines={1}
        >
          {item.text}
        </Text>
        <Feather name="chevron-right" size={22} color="#8b9bb0" />
      </View>

      <Text style={{ color: "#9ca3af", marginTop: 8, fontSize: 12 }}>
        {fmtDate(item.createdAt)} • 스텝 {doneCnt}/{totalCnt}
      </Text>

      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onDone(item.id); }}
          style={{
            backgroundColor: "#22c55e",
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {item.done ? "취소" : "완료"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onRemove(item.id); }}
          style={{ marginLeft: 16 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
});

/* 스텝 입력 */
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
          flex: 1, backgroundColor: "#111827", color: "white",
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
        }}
        returnKeyType="done"
        onSubmitEditing={fire}
      />
      <TouchableOpacity
        onPress={fire}
        style={{
          backgroundColor: "#475569", paddingHorizontal: 14, borderRadius: 10,
          marginLeft: 8, justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>추가</Text>
      </TouchableOpacity>
    </View>
  );
});

/* ---------------- App (상태 보유) ---------------- */
const Stack = createNativeStackNavigator();

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedCat, setSelectedCat] = useState("short");

  // 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // 저장(디바운스)
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    }, 200);
    return () => clearTimeout(saveTimer.current);
  }, [tasks]);

  // 액션들
  const addTask = useCallback((text) => {
    const t = {
      id: String(Date.now()),
      text,
      done: false,
      createdAt: Date.now(),
      category: "short",
      checklist: [],
      memo: "",
    };
    setTasks((prev) => [t, ...prev]);
    setSelectedCat("short");
  }, []);

  const toggleDone = useCallback((id) => {
    setTasks((prev) => {
      const before = prev.find((t) => t.id === id);
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      if (before && !before.done) setSelectedCat("done");
      return next;
    });
  }, []);

  const setCategory = useCallback((id, cat) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: cat, done: false } : t))
    );
    setSelectedCat(cat);
  }, []);

  const removeTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addStep = useCallback((id, text) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, checklist: [...(t.checklist ?? []), { text, done: false }] } : t
      )
    );
  }, []);

  const toggleStep = useCallback((id, idx) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const list = [...(t.checklist ?? [])];
        list[idx] = { ...list[idx], done: !list[idx].done };
        return { ...t, checklist: list };
      })
    );
  }, []);

  const removeStep = useCallback((id, idx) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const list = [...(t.checklist ?? [])];
        list.splice(idx, 1);
        return { ...t, checklist: list };
      })
    );
  }, []);

  const updateMemo = useCallback((id, memo) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, memo } : t)));
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="List">
          {(props) => (
            <ListScreen
              {...props}
              tasks={tasks}
              selectedCat={selectedCat}
              setSelectedCat={setSelectedCat}
              addTask={addTask}
              toggleDone={toggleDone}
              removeTask={removeTask}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail">
          {(props) => (
            <DetailScreen
              {...props}
              tasks={tasks}
              toggleDone={toggleDone}
              setCategory={setCategory}
              addStep={addStep}
              toggleStep={toggleStep}
              removeStep={removeStep}
              updateMemo={updateMemo}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* --------------- 목록 화면 --------------- */
function ListScreen({ navigation, tasks, selectedCat, setSelectedCat, addTask, toggleDone, removeTask }) {
  const [input, setInput] = useState("");

  const filtered = useMemo(() => {
    if (selectedCat === "done") return tasks.filter((t) => t.done);
    return tasks.filter((t) => !t.done && t.category === selectedCat);
  }, [tasks, selectedCat]);

  const openTask = (t) => navigation.navigate("Detail", { id: t.id });

  const submit = () => {
    const v = input.trim();
    if (!v) return;
    addTask(v);
    setInput("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 + 탭 */}
      <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>원하는-일 처리기</Text>
          <View style={{ flexDirection: "row" }}>
            {CATS.map((c, i) => (
              <Pressable
                key={c.key}
                onPress={() => setSelectedCat(c.key)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: selectedCat === c.key ? "#111827" : "#1f2937",
                  marginLeft: i === 0 ? 0 : 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{c.label}</Text>
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
            onSubmitEditing={submit}
          />
          <TouchableOpacity
            onPress={submit}
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
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <TaskCard item={item} onOpen={openTask} onDone={toggleDone} onRemove={removeTask} />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: "#9ca3af", marginTop: 30, textAlign: "center" }}>
              {selectedCat === "done" ? "완료한 항목이 없어요." : "이 카테고리에 항목이 없어요."}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

/* --------------- 상세 화면 (풀스크린) --------------- */
function DetailScreen({
  route, navigation, tasks, toggleDone, setCategory,
  addStep, toggleStep, removeStep, updateMemo,
}) {
  const { id } = route.params;
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "white" }}>항목을 찾을 수 없어요.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#60a5fa" }}>뒤로가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top", "bottom", "left", "right"]}>
      {/* 상단 바 */}
      <View
        style={{
          paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 6 }}>
          <Feather name="arrow-left" size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "800", flex: 1 }}>항목 상세</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => toggleDone(task.id)}
            style={{ backgroundColor: "#22c55e", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>{task.done ? "취소" : "완료"}</Text>
          </TouchableOpacity>
          {["short", "info", "long"].map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setCategory(task.id, k)}
              style={{
                backgroundColor: task.category === k ? "#111827" : "#1f2937",
                paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginLeft: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 본문 */}
      <View style={{ paddingHorizontal: 18 }}>
        {/* 제목/상태 */}
        <View style={{ marginTop: 14, padding: 14, backgroundColor: "#111827", borderRadius: 12 }}>
          <Text style={{ color: "white", fontSize: 16 }}>{task.text}</Text>
          <Text style={{ color: "#9ca3af", marginTop: 6, fontSize: 12 }}>
            상태: {task.done ? "완료" : "진행중"} · 분류: {task.done ? "완료" : LABEL[task.category] || "-"}
          </Text>
        </View>

        {/* 체크리스트 */}
        <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginTop: 14 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>체크리스트</Text>
          <View style={{ marginTop: 10 }}>
            {(task.checklist ?? []).map((s, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                <Pressable
                  onPress={() => toggleStep(task.id, idx)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: s.done ? "#22c55e" : "#334155",
                    backgroundColor: s.done ? "#22c55e" : "transparent",
                    justifyContent: "center", alignItems: "center", marginRight: 10,
                  }}
                >
                  {s.done ? <Feather name="check" size={16} color="white" /> : null}
                </Pressable>
                <Text
                  style={{
                    flex: 1, color: "white", fontSize: 15,
                    textDecorationLine: s.done ? "line-through" : "none", opacity: s.done ? 0.6 : 1,
                  }}
                >
                  {s.text}
                </Text>
                <Pressable onPress={() => removeStep(task.id, idx)}>
                  <Feather name="x" size={18} color="#94a3b8" />
                </Pressable>
              </View>
            ))}
          </View>
          <AddStepInput onSubmit={(txt) => addStep(task.id, txt)} />
        </View>

        {/* 메모 */}
        <View style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginTop: 14 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>메모</Text>
          <TextInput
            value={task.memo ?? ""}
            onChangeText={(t) => updateMemo(task.id, t)}
            placeholder="생각을 던져 넣어라. 흐릿한 아이디어라도 기록하면 칼이 된다."
            placeholderTextColor="#6b7280"
            multiline
            style={{
              marginTop: 10, minHeight: 90, color: "white", backgroundColor: "#111827",
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: "top", fontSize: 14,
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}