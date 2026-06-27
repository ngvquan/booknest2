import { AdminSections } from "@/components/AdminSections";
import { useColors } from "@/hooks/useColors";
import {
  fetchBooks,
  fetchCategories,
  fetchChaptersByBook,
  fetchPaymentAttempts,
  fetchProfiles,
} from "@/lib/booksService";
import { formatAdminError, isSuccessfulPayment } from "@/lib/adminUtils";
import { getImageMeta, readImageFile } from "@/lib/imageUpload";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Section = "dashboard" | "accounts" | "catalog" | "revenue";
type CatalogTab = "books" | "categories" | "chapters";

type AdminBook = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
};

type AdminChapter = {
  id: string;
  book_id: string;
  chapter_no: number;
  title: string;
  content: string;
};

const ADMIN_AUTO_REFRESH_MS = 5000;

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("dashboard");
  const [status, setStatus] = useState("");

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [payments, setPayments] = useState<Array<any>>([]);
  const [isRefreshingAdmin, setIsRefreshingAdmin] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [catalogTab, setCatalogTab] = useState<CatalogTab>("books");
  const [newCategory, setNewCategory] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterNo, setChapterNo] = useState("1");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [bookCategorySearch, setBookCategorySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [chapterBookSearch, setChapterBookSearch] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pages, setPages] = useState<Record<string, number>>({
    accounts: 1,
    books: 1,
    categories: 1,
    chapterBooks: 1,
    chapterList: 1,
    revenue: 1,
  });

  const topPad = insets.top + 8;

  function setPage(key: string, page: number) {
    setPages((prev) => ({ ...prev, [key]: Math.max(page, 1) }));
  }

  async function reloadAll() {
    const [categoryRows, bookRows, profileRows, paymentRows] = await Promise.all([
      fetchCategories(),
      fetchBooks(),
      fetchProfiles(),
      fetchPaymentAttempts(),
    ]);

    setCategories(categoryRows);
    setBooks(bookRows.map((book) => ({ id: book.id, title: book.title, author: book.author, cover_url: book.cover })));
    setProfiles(profileRows);
    setPayments(paymentRows);
    setLastSyncedAt(new Date());

    if (!selectedBookId && bookRows[0]) setSelectedBookId(bookRows[0].id);
  }

  async function reloadVipAndPayments(options: { silent?: boolean } = {}) {
    if (!options.silent) setIsRefreshingAdmin(true);

    try {
      const [profileRows, paymentRows] = await Promise.all([
        fetchProfiles(),
        fetchPaymentAttempts(),
      ]);

      setProfiles(profileRows);
      setPayments(paymentRows);
      setLastSyncedAt(new Date());

      if (!options.silent) {
        setStatus("Đã làm mới dữ liệu admin");
      }
    } catch (e) {
      if (!options.silent) {
        setStatus(e instanceof Error ? e.message : "Không làm mới được dữ liệu admin");
      }
    } finally {
      if (!options.silent) setIsRefreshingAdmin(false);
    }
  }

  useEffect(() => {
    reloadAll().catch((e) => setStatus(e.message || "Không tải được dữ liệu admin"));

    const timer = setInterval(() => {
      reloadVipAndPayments({ silent: true });
    }, ADMIN_AUTO_REFRESH_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    resetChapterForm();
    if (!selectedBookId) {
      setChapters([]);
      return;
    }
    refreshChapters(selectedBookId).catch(() => setChapters([]));
  }, [selectedBookId]);

  const selectedBook = useMemo(() => books.find((book) => book.id === selectedBookId), [books, selectedBookId]);
  const vipCount = profiles.filter((profile) => profile.is_vip).length;
  const successfulPayments = useMemo(
    () => payments.filter((payment) => isSuccessfulPayment(payment.status)),
    [payments],
  );
  const totalRevenue = useMemo(
    () => successfulPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [successfulPayments],
  );

  function resetBookForm() {
    setBookTitle("");
    setBookAuthor("");
    setBookCover("");
    setSelectedCategoryId("");
    setEditingBookId(null);
  }

  function resetChapterForm() {
    setEditingChapterId(null);
    setChapterNo("1");
    setChapterTitle("");
    setChapterContent("");
  }

  async function refreshChapters(bookId = selectedBookId) {
    if (!bookId) {
      setChapters([]);
      return [];
    }

    const rows = await fetchChaptersByBook(bookId);
    setChapters(rows as AdminChapter[]);
    return rows as AdminChapter[];
  }

  async function pickCoverImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      setStatus("Cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const { ext, contentType } = getImageMeta(asset);
    const storagePath = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploadingCover(true);
    try {
      const arrayBuffer = await readImageFile(asset.uri);
      const { error } = await supabase.storage
        .from("book-covers")
        .upload(storagePath, arrayBuffer, { contentType, upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from("book-covers").getPublicUrl(storagePath);
      setBookCover(data.publicUrl);
      setStatus("Đã chọn ảnh bìa.");
    } catch (e) {
      setStatus(formatAdminError(e));
    } finally {
      setUploadingCover(false);
    }
  }

  function SidebarItem({ id, label, icon }: { id: Section; label: string; icon: any }) {
    const active = section === id;
    return (
      <Pressable
        onPress={() => setSection(id)}
        className={`flex-row items-center gap-2.5 rounded-lg border px-2.5 py-2.5 ${
          active ? "border-[#2f6fbf] bg-[#1a4e92]" : "border-transparent bg-transparent"
        }`}
      >
        <Feather name={icon} size={15} color="#d7e7ff" />
        <Text className="text-[13px] font-semibold text-[#d7e7ff]">{label}</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f6]" style={{ paddingTop: topPad }}>
      <View className="flex-1 flex-row">
        <View className="w-[220px] gap-2 bg-[#0f243b] p-[14px]">
          <Text className="mb-2 text-lg font-extrabold text-[#f1f7ff]">BOOK ADMIN</Text>
          <Text className="mb-1 text-xs text-[#8db2db]">Điều hướng</Text>
          <SidebarItem id="dashboard" label="Tổng quan" icon="grid" />
          <SidebarItem id="accounts" label="Quản lý user" icon="users" />
          <SidebarItem id="catalog" label="Catalog" icon="book-open" />
          <SidebarItem id="revenue" label="Doanh thu" icon="trending-up" />
        </View>

        <View className="flex-1">
          <View className="h-14 flex-row items-center justify-between border-b bg-white px-4" style={{ borderColor: colors.border }}>
            <Text className="text-[15px] font-bold text-[#1e2a36]">
              {section === "dashboard" ? "TỔNG QUAN" : section === "accounts" ? "QUẢN LÝ USER" : section === "catalog" ? "CATALOG" : "DOANH THU"}
            </Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs text-[#6a7684]">
                {lastSyncedAt
                  ? `Cập nhật ${lastSyncedAt.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}`
                  : new Date().toLocaleDateString("vi-VN")}
              </Text>
              <Pressable
                className="h-8 flex-row items-center gap-1.5 rounded-lg border border-[#d0d9e4] px-2.5"
                onPress={() => reloadVipAndPayments()}
                disabled={isRefreshingAdmin}
              >
                {isRefreshingAdmin ? (
                  <ActivityIndicator size="small" color="#235ea7" />
                ) : (
                  <Feather name="refresh-cw" size={13} color="#235ea7" />
                )}
                <Text className="text-xs font-bold text-[#235ea7]">Làm mới</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerClassName="gap-[14px] p-4">
            {!!status && (
              <View className="rounded-lg border border-[#d0d9e4] bg-white px-3 py-2">
                <Text className="text-xs font-semibold text-[#415264]">{status}</Text>
              </View>
            )}

            <AdminSections
              section={section}
              profiles={profiles}
              vipCount={vipCount}
              books={books}
              totalRevenue={totalRevenue}
              pages={pages}
              setPage={setPage}
              setStatus={setStatus}
              reloadAll={reloadAll}
              catalogTab={catalogTab}
              setCatalogTab={setCatalogTab}
              categories={categories}
              chapters={chapters}
              successfulPayments={successfulPayments}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              bookTitle={bookTitle}
              setBookTitle={setBookTitle}
              bookAuthor={bookAuthor}
              setBookAuthor={setBookAuthor}
              bookCover={bookCover}
              setBookCover={setBookCover}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              editingBookId={editingBookId}
              setEditingBookId={setEditingBookId}
              selectedBookId={selectedBookId}
              setSelectedBookId={setSelectedBookId}
              selectedBook={selectedBook}
              editingChapterId={editingChapterId}
              setEditingChapterId={setEditingChapterId}
              chapterNo={chapterNo}
              setChapterNo={setChapterNo}
              chapterTitle={chapterTitle}
              setChapterTitle={setChapterTitle}
              chapterContent={chapterContent}
              setChapterContent={setChapterContent}
              bookCategorySearch={bookCategorySearch}
              setBookCategorySearch={setBookCategorySearch}
              categorySearch={categorySearch}
              setCategorySearch={setCategorySearch}
              chapterBookSearch={chapterBookSearch}
              setChapterBookSearch={setChapterBookSearch}
              uploadingCover={uploadingCover}
              pickCoverImage={pickCoverImage}
              resetBookForm={resetBookForm}
              resetChapterForm={resetChapterForm}
              refreshChapters={refreshChapters}
            />
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
