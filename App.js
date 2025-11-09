// App.js
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { Feather } from "@expo/vector-icons";

// 저장 키
const STORAGE_KEY = "TASKS_V2";

// 탭 정의
const CATS = [
  { key: "now", label: "당장" },
  { key: "info", label: "정보" },
  { key: "someday", label: "언젠가" },
  { key: "done", label: "완료" },
];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [selectedCat, setSelectedCat] = useState("now"); // 기본 탭
  const [modalTask, setModalTask] = useState(null);

  // 네비게이션 바 숨김
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  // 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {
        /* noop */
      }
    })();
  }, []);

  // 저장
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks]);

  // 추가 (기본 카테고리 now)
  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const t = {
      id: String(Date.now()),
      text,
      done: false,
      createdAt: Date.now(),
      category: "now",
    };
    setTasks((prev) => [t, ...prev]);
    setInput("");
    setSelectedCat("now");
  };

  const openTask = (t) => setModalTask(t);
  const closeModal = () => setModalTask(null);

  const toggleDone = (id) => {
    // 토글 전 상태를 보고 완료 탭으로 전환
    const before = tasks.find((t) => t.id === id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
    if (before && !before.done) setSelectedCat("done");
  };

  const setCategory = (id, cat) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, category: cat, done: false } : t
      )
    );
    setSelectedCat(cat);
    closeModal();
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    closeModal();
  };

  // 탭 필터링
  const filtered = useMemo(() => {
    if (selectedCat === "done") return tasks.filter((t) => t.done);
    return tasks.filter((t) => !t.done && t.category === selectedCat);
  }, [tasks, selectedCat]);

  const TaskItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => openTask(item)}
      onLongPress={() => removeTask(item.id)}
      style={{
        padding: 16,
        marginVertical: 6,
        borderRadius: 14,
        backgroundColor: item.done ? "#e6ffe6" : "#eef2ff",
        borderWidth: 1,
        borderColor: item.done ? "#b7f0b7" : "#c7d2fe",
      }}
    >
      <Text
        style={{ fontSize: 17, fontWeight: "600", opacity: item.done ? 0.6 : 1 }}
      >
        {item.text}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>
        {item.done
          ? "완료"
          : { now: "당장", info: "정보", someday: "언젠가" }[item.category]}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" hidden />

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
          <View style={{ flexDirection: "row", gap: 8 }}>
            {CATS.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setSelectedCat(c.key)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor:
                    selectedCat === c.key ? "#111827" : "#1f2937",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* 입력 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ paddingHorizontal: 18, flexDirection: "row", gap: 8 }}>
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
          renderItem={TaskItem}
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

                  {/* 상단 우측: 완료 + 3버튼 */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
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

                    {["now", "info", "someday"].map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCategory(modalTask.id, c)}
                        style={{
                          backgroundColor:
                            modalTask.category === c ? "#111827" : "#1f2937",
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "800" }}>
                          {c === "now" ? "당장" : c === "info" ? "정보" : "언젠가"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

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
                    {modalTask.done
                      ? "완료"
                      : { now: "당장", info: "정보", someday: "언젠가" }[
                          modalTask.category
                        ] || "-"}
                  </Text>
                </View>

                <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      removeTask(modalTask.id);
                    }}
                    style={{
                      backgroundColor: "#ef4444",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "800" }}>삭제</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={{
                      backgroundColor: "#374151",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "800" }}>닫기</Text>
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