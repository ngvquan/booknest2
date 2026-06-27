import { EmptyState, Metric, paginate, Pagination, Panel } from "@/components/AdminParts";
import { formatAdminError, formatVnd, getVipInfo } from "@/lib/adminUtils";
import {
  createBook,
  createCategory,
  createChapter,
  removeBook,
  removeCategory,
  removeChapter,
  updateBook,
  updateChapter,
  updateProfileAdmin,
} from "@/lib/booksService";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type AdminSectionsProps = {
  profiles: any[];
  books: any[];
  categories: any[];
  chapters: any[];
  successfulPayments: any[];
  [key: string]: any;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesSearch(value: unknown, query: string) {
  if (!query) return true;
  return normalizeSearch(String(value || "")).includes(query);
}

export function AdminSections(props: AdminSectionsProps) {
  const {
    section,
    profiles,
    vipCount,
    books,
    totalRevenue,
    pages,
    setPage,
    setStatus,
    reloadAll,
    catalogTab,
    setCatalogTab,
    categories,
    chapters,
    successfulPayments,
    newCategory,
    setNewCategory,
    bookTitle,
    setBookTitle,
    bookAuthor,
    setBookAuthor,
    bookCover,
    setBookCover,
    selectedCategoryId,
    setSelectedCategoryId,
    editingBookId,
    setEditingBookId,
    selectedBookId,
    setSelectedBookId,
    selectedBook,
    editingChapterId,
    setEditingChapterId,
    chapterNo,
    setChapterNo,
    chapterTitle,
    setChapterTitle,
    chapterContent,
    setChapterContent,
    bookCategorySearch,
    setBookCategorySearch,
    categorySearch,
    setCategorySearch,
    chapterBookSearch,
    setChapterBookSearch,
    uploadingCover,
    pickCoverImage,
    resetBookForm,
    resetChapterForm,
    refreshChapters,
  } = props;
  const bookCategoryQuery = normalizeSearch(bookCategorySearch || "");
  const categoryQuery = normalizeSearch(categorySearch || "");
  const chapterBookQuery = normalizeSearch(chapterBookSearch || "");
  const bookCategoryResults = categories.filter((category) =>
    includesSearch(category.name, bookCategoryQuery),
  );
  const categoryResults = categories.filter((category) =>
    includesSearch(category.name, categoryQuery),
  );
  const chapterBookResults = books.filter((book) => {
    if (!chapterBookQuery) return true;
    return (
      includesSearch(book.title, chapterBookQuery) ||
      includesSearch(book.author, chapterBookQuery)
    );
  });

  return (
    <>            {section === "dashboard" && (
              <>
                <View className="flex-row flex-wrap gap-2.5">
                  <Metric title="Người dùng" value={profiles.length.toString()} color="#3f8efc" />
                  <Metric title="User VIP" value={vipCount.toString()} color="#27c3a7" />
                  <Metric title="Sách" value={books.length.toString()} color="#f5a623" />
                  <Metric title="Doanh thu" value={formatVnd(totalRevenue)} color="#20a36b" />
                </View>
                <Panel title="Tổng quan">
                  <Text className="text-[13px] text-[#526272]">
                    Dùng menu bên trái để quản lý tài khoản, catalog và doanh thu.
                  </Text>
                </Panel>
              </>
            )}

            {section === "accounts" && (
              <Panel title="Quản lý user">
                {profiles.length === 0 ? (
                  <EmptyState text="Chưa tải được user từ database." />
                ) : (
                  paginate(profiles, pages.accounts).map((user) => {
                    const vipInfo = getVipInfo(user);
                    const shouldGrantVip = !vipInfo.active;

                    return (
                    <View key={user.id} className="flex-row items-center gap-2 rounded-lg border border-[#e5e9ef] px-2.5 py-[9px]">
                      <View className="flex-1 gap-1">
                        <Text className="text-[13px] font-semibold text-[#1e2a36]">
                          {user.username || "Không có tên"} ({user.role})
                        </Text>
                        <View className="self-start rounded-full px-2 py-1" style={{ backgroundColor: vipInfo.badgeBg }}>
                          <Text className="text-[11px] font-extrabold" style={{ color: vipInfo.badgeText }}>
                            {vipInfo.label}
                          </Text>
                        </View>
                        <Text className="text-xs text-[#6c7a88]">{user.email}</Text>
                        <Text className="text-xs font-semibold" style={{ color: vipInfo.badgeText }}>
                          {vipInfo.detail}
                        </Text>
                      </View>
                      <Pressable
                        className="rounded-[7px] bg-[#edf5ff] px-2.5 py-[7px]"
                        onPress={async () => {
                          const until = shouldGrantVip ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
                          const { error } = await updateProfileAdmin(user.id, {
                            is_vip: shouldGrantVip,
                            vip_expired_at: until,
                          });
                          if (error) return setStatus(formatAdminError(error));
                          setStatus("Đã cập nhật VIP");
                          setStatus(shouldGrantVip ? "Đã cấp VIP 30 ngày" : "Đã bỏ VIP");
                          reloadAll();
                        }}
                      >
                        <Text className="text-xs font-bold text-[#235ea7]">
                          {vipInfo.active ? "Bỏ VIP" : vipInfo.expired ? "Gia hạn VIP" : "Cấp VIP"}
                        </Text>
                      </Pressable>
                    </View>
                    );
                  })
                )}
                <Pagination total={profiles.length} page={pages.accounts} onChange={(page) => setPage("accounts", page)} />
              </Panel>
            )}

            {section === "catalog" && (
              <>
                <View className="flex-row gap-5 border-b border-[#dce3ea] pb-1">
                  {(["books", "categories", "chapters"] as const).map((tab) => (
                    <Pressable key={tab} onPress={() => setCatalogTab(tab)} className="px-1">
                      <Text className={`text-sm font-bold ${catalogTab === tab ? "text-[#3f8efc]" : "text-[#6a7684]"}`}>
                        {tab === "books" ? "SÁCH" : tab === "categories" ? "THỂ LOẠI" : "CHƯƠNG"}
                      </Text>
                      {catalogTab === tab && <View className="mt-1 h-0.5 bg-[#3f8efc]" />}
                    </Pressable>
                  ))}
                </View>

                <View className="flex-row flex-wrap gap-2.5">
                  <Metric title="Thể loại" value={categories.length.toString()} color="#0f62fe" />
                  <Metric title="Sách" value={books.length.toString()} color="#f5a623" />
                </View>

                {catalogTab === "categories" && (
                  <Panel title="Thể loại">
                    <View className="gap-3">
                    <View className="flex-row gap-2">
                      <TextInput
                        value={newCategory}
                        onChangeText={setNewCategory}
                        placeholder="Tên thể loại"
                        className="flex-1 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                      <Pressable
                        className="items-center justify-center rounded-lg bg-[#3f8efc] px-3 py-2.5"
                        onPress={async () => {
                          const name = newCategory.trim();
                          if (!name) return setStatus("Vui lòng nhập tên thể loại.");
                          const { error } = await createCategory(name);
                          if (error) return setStatus(formatAdminError(error));
                          setNewCategory("");
                          reloadAll();
                        }}
                      >
                        <Text className="text-[13px] font-bold text-white">Thêm</Text>
                      </Pressable>
                    </View>
                    </View>
                    <TextInput
                      value={categorySearch}
                      onChangeText={(text) => {
                        setCategorySearch(text);
                        setPage("categories", 1);
                      }}
                      placeholder="Tìm thể loại"
                      className="rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                    />
                    {categoryResults.length === 0 ? (
                      <EmptyState text="Chưa có thể loại nào." />
                    ) : (
                      paginate(categoryResults, pages.categories).map((category) => (
                        <View key={category.id} className="flex-row items-center gap-2 rounded-lg border border-[#e5e9ef] px-2.5 py-[9px]">
                          <View className="flex-1 gap-0.5">
                            <Text className="text-[13px] font-semibold text-[#1e2a36]">{category.name}</Text>
                            <Text className="text-xs text-[#6c7a88]">{category.id}</Text>
                          </View>
                          <Pressable
                            onPress={async () => {
                              await removeCategory(category.id);
                              reloadAll();
                            }}
                          >
                            <Text className="text-xs font-bold text-[#c62828]">Xóa</Text>
                          </Pressable>
                        </View>
                      ))
                    )}
                    <Pagination total={categoryResults.length} page={pages.categories} onChange={(page) => setPage("categories", page)} />
                  </Panel>
                )}

                {catalogTab === "books" && (
                  <Panel title={editingBookId ? "Cập nhật sách" : "Thêm sách"}>
                    <View className="gap-2">
                      <TextInput
                        value={bookTitle}
                        onChangeText={setBookTitle}
                        placeholder="Tên sách"
                        className="rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                      <TextInput
                        value={bookAuthor}
                        onChangeText={setBookAuthor}
                        placeholder="Tác giả"
                        className="rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                      <View className="flex-row gap-2">
                        <TextInput
                          value={bookCover}
                          onChangeText={setBookCover}
                          placeholder="URL ảnh bìa"
                          className="flex-1 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                        />
                        <Pressable
                          className="min-w-[110px] items-center justify-center rounded-lg bg-[#eef5ff] px-3 py-2.5"
                          onPress={pickCoverImage}
                          disabled={uploadingCover}
                        >
                          {uploadingCover ? (
                            <ActivityIndicator size="small" color="#235ea7" />
                          ) : (
                            <Text className="text-[13px] font-bold text-[#235ea7]">Chọn ảnh</Text>
                          )}
                        </Pressable>
                      </View>
                      {!!bookCover.trim() && (
                        <View className="flex-row items-center gap-3 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] p-2">
                          <Image
                            source={{ uri: bookCover.trim() }}
                            contentFit="cover"
                            style={{
                              width: 56,
                              height: 76,
                              borderRadius: 8,
                              backgroundColor: "#e5e9ef",
                            }}
                          />
                          <View className="flex-1 gap-1">
                            <Text className="text-xs font-bold text-[#1e2a36]">Ảnh bìa đã chọn</Text>
                            <Text className="text-xs text-[#6c7a88]" numberOfLines={2}>{bookCover.trim()}</Text>
                          </View>
                        </View>
                      )}
                      <View className="gap-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-bold text-[#64748b]">Thể loại</Text>
                          {!!selectedCategoryId && (
                            <Pressable onPress={() => setSelectedCategoryId("")}>
                              <Text className="text-xs font-bold text-[#c62828]">Bỏ chọn</Text>
                            </Pressable>
                          )}
                        </View>
                        <TextInput
                          value={bookCategorySearch}
                          onChangeText={setBookCategorySearch}
                          placeholder="Tìm thể loại"
                          className="rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                        />
                        <View className="max-h-[150px] rounded-lg border border-[#d5dbe3] bg-[#f8fafc] p-2">
                          <ScrollView nestedScrollEnabled>
                            {bookCategoryResults.length === 0 ? (
                              <Text className="px-2 py-2 text-xs text-[#6c7a88]">Chưa có thể loại.</Text>
                            ) : (
                              bookCategoryResults.map((category) => {
                                const active = selectedCategoryId === category.id;
                                return (
                                  <Pressable
                                    key={category.id}
                                    className="mb-2 rounded-lg border px-3 py-2"
                                    style={{
                                      borderColor: active ? "#3f8efc" : "#e5e9ef",
                                      backgroundColor: active ? "#edf5ff" : "#fff",
                                    }}
                                    onPress={() => setSelectedCategoryId(category.id)}
                                  >
                                    <Text className="text-[13px] font-bold text-[#1e2a36]">{category.name}</Text>
                                  </Pressable>
                                );
                              })
                            )}
                          </ScrollView>
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable
                          className="flex-1 items-center justify-center rounded-lg bg-[#3f8efc] px-3 py-2.5"
                          onPress={async () => {
                            if (!bookTitle.trim()) return setStatus("Vui lòng nhập tên sách");
                            const payload = {
                              title: bookTitle.trim(),
                              author: bookAuthor.trim() || "Unknown",
                              category_id: selectedCategoryId.trim() || null,
                              cover_url: bookCover.trim() || "https://picsum.photos/300/420",
                            };
                            const { error } = editingBookId
                              ? await updateBook(editingBookId, payload)
                              : await createBook({ ...payload, description: "", total_chapters: 0 });
                            if (error) return setStatus(formatAdminError(error));
                            resetBookForm();
                            reloadAll();
                          }}
                        >
                          <Text className="text-[13px] font-bold text-white">{editingBookId ? "Cập nhật" : "Thêm sách"}</Text>
                        </Pressable>
                        {editingBookId && (
                          <Pressable className="items-center justify-center rounded-lg bg-[#f1f5f9] px-4 py-2.5" onPress={resetBookForm}>
                            <Text className="text-[13px] font-bold text-[#475569]">Hủy</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    <View className="mt-4 gap-2">
                      <Text className="text-xs font-bold text-[#64748b]">DANH SÁCH SÁCH</Text>
                      {books.length === 0 ? (
                        <EmptyState text="Chưa có sách nào." />
                      ) : (
                        paginate(books, pages.books).map((book) => (
                          <View key={book.id} className="flex-row items-center gap-2 rounded-lg border border-[#e5e9ef] px-2.5 py-[9px]">
                            <View className="flex-1 gap-0.5">
                              <Text className="text-[13px] font-semibold text-[#1e2a36]">{book.title}</Text>
                              <Text className="text-xs text-[#6c7a88]">{book.author}</Text>
                              <Text className="text-xs text-[#6c7a88]" numberOfLines={1}>{book.cover_url}</Text>
                            </View>
                            <View className="flex-row gap-3">
                              <Pressable
                                onPress={() => {
                                  setEditingBookId(book.id);
                                  setBookTitle(book.title);
                                  setBookAuthor(book.author);
                                  setBookCover(book.cover_url);
                                  setCatalogTab("books");
                                  setStatus(`Đang sửa: ${book.title}`);
                                }}
                              >
                                <Text className="text-xs font-bold text-[#3f8efc]">Sửa</Text>
                              </Pressable>
                              <Pressable
                                onPress={async () => {
                                  await removeBook(book.id);
                                  reloadAll();
                                }}
                              >
                                <Text className="text-xs font-bold text-[#c62828]">Xóa</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      )}
                      <Pagination total={books.length} page={pages.books} onChange={(page) => setPage("books", page)} />
                    </View>
                  </Panel>
                )}

                {catalogTab === "chapters" && (
                  <Panel title="Chương">
                    <View className="flex-row items-center justify-between gap-3">
                      <View>
                        <Text className="text-xs text-[#6c7a88]">Sách đang chọn</Text>
                        <Text className="text-base font-extrabold text-[#1e2a36]">{selectedBook?.title ?? "Chưa chọn sách"}</Text>
                      </View>
                      <Text className="text-xs font-bold text-[#6c7a88]">{chapters.length} chương</Text>
                    </View>

                    <View className="gap-2">
                      <Text className="text-xs font-bold text-[#64748b]">Chọn sách</Text>
                      <TextInput
                        value={chapterBookSearch}
                        onChangeText={(text) => {
                          setChapterBookSearch(text);
                          setPage("chapterBooks", 1);
                        }}
                        placeholder="Tìm truyện"
                        className="rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                      <View className="max-h-[180px] gap-2 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] p-2">
                        <ScrollView nestedScrollEnabled>
                          {chapterBookResults.length === 0 ? (
                            <Text className="px-2 py-2 text-xs text-[#6c7a88]">Không tìm thấy truyện.</Text>
                          ) : paginate(chapterBookResults, pages.chapterBooks).map((book) => {
                            const active = selectedBookId === book.id;
                            return (
                              <Pressable
                                key={book.id}
                                className="mb-2 rounded-lg border px-3 py-2"
                                style={{
                                  borderColor: active ? "#3f8efc" : "#e5e9ef",
                                  backgroundColor: active ? "#edf5ff" : "#fff",
                                }}
                                onPress={() => setSelectedBookId(book.id)}
                              >
                                <Text className="text-[13px] font-bold text-[#1e2a36]">{book.title}</Text>
                                <Text className="text-xs text-[#6c7a88]">{book.author}</Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <Pagination total={chapterBookResults.length} page={pages.chapterBooks} onChange={(page) => setPage("chapterBooks", page)} />
                    </View>

                    <View className="flex-row gap-2">
                      <TextInput
                        value={chapterNo}
                        onChangeText={setChapterNo}
                        placeholder="Số chương"
                        className="w-28 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                      <TextInput
                        value={chapterTitle}
                        onChangeText={setChapterTitle}
                        placeholder="Tiêu đề chương"
                        className="flex-1 rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      />
                    </View>
                    <TextInput
                      value={chapterContent}
                      onChangeText={setChapterContent}
                      placeholder="Nội dung chương"
                      className="min-h-[90px] rounded-lg border border-[#d5dbe3] bg-[#f8fafc] px-2.5 py-[9px] text-[13px]"
                      style={{ textAlignVertical: "top" }}
                      multiline
                    />
                    <View className="flex-row gap-2">
                    <Pressable
                      className="flex-1 items-center justify-center rounded-lg bg-[#3f8efc] px-3 py-2.5"
                      onPress={async () => {
                        if (!selectedBookId) return setStatus("Vui lòng chọn sách trước khi thêm chương.");
                        const payload = {
                          book_id: selectedBookId,
                          chapter_no: Number(chapterNo) || 1,
                          title: chapterTitle.trim() || `Chương ${chapterNo}`,
                          content: chapterContent.trim() || "Nội dung cập nhật sau",
                        };
                        const { error } = editingChapterId
                          ? await updateChapter(editingChapterId, payload)
                          : await createChapter(payload);
                        if (error) return setStatus(formatAdminError(error));
                        await refreshChapters(selectedBookId);
                        resetChapterForm();
                        setStatus(editingChapterId ? "Đã cập nhật chương" : "Đã thêm chương");
                      }}
                    >
                      <Text className="text-[13px] font-bold text-white">
                        {editingChapterId ? "Cập nhật chương" : "Thêm chương"}
                      </Text>
                    </Pressable>
                    {editingChapterId && (
                      <Pressable
                        className="items-center justify-center rounded-lg bg-[#f1f5f9] px-4 py-2.5"
                        onPress={resetChapterForm}
                      >
                        <Text className="text-[13px] font-bold text-[#475569]">Hủy</Text>
                      </Pressable>
                    )}
                    </View>

                    <View className="gap-2">
                      {chapters.length === 0 ? (
                        <EmptyState text="Chưa có chương cho sách đang chọn." />
                      ) : (
                        paginate(chapters, pages.chapterList).map((chapter) => (
                          <View key={chapter.id} className="flex-row items-center gap-2 rounded-lg border border-[#e5e9ef] px-2.5 py-[9px]">
                            <View className="flex-1 flex-row items-center gap-2.5">
                              <Text className="w-7 text-center font-extrabold text-[#235ea7]">{chapter.chapter_no}</Text>
                              <View className="flex-1">
                                <Text className="text-[13px] font-semibold text-[#1e2a36]">{chapter.title}</Text>
                                <Text className="text-xs text-[#6c7a88]">{chapter.id}</Text>
                              </View>
                            </View>
                            <View className="flex-row gap-3">
                              <Pressable
                                onPress={() => {
                                  setEditingChapterId(chapter.id);
                                  setChapterNo(String(chapter.chapter_no));
                                  setChapterTitle(chapter.title);
                                  setChapterContent(chapter.content ?? "");
                                  setStatus(`Đang sửa chương ${chapter.chapter_no}`);
                                }}
                              >
                                <Text className="text-xs font-bold text-[#3f8efc]">Sửa</Text>
                              </Pressable>
                              <Pressable
                                onPress={async () => {
                                  await removeChapter(chapter.id);
                                  await refreshChapters(selectedBookId);
                                  if (editingChapterId === chapter.id) resetChapterForm();
                                }}
                              >
                                <Text className="text-xs font-bold text-[#c62828]">Xóa</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      )}
                      <Pagination total={chapters.length} page={pages.chapterList} onChange={(page) => setPage("chapterList", page)} />
                    </View>
                  </Panel>
                )}
              </>
            )}

            {section === "revenue" && (
              <View className="gap-[14px]">
                <View className="flex-row flex-wrap gap-2.5">
                  <Metric title="Tổng doanh thu" value={formatVnd(totalRevenue)} color="#27c3a7" />
                  <Metric title="Giao dịch thành công" value={successfulPayments.length.toString()} color="#3f8efc" />
                </View>
                <Panel title="Giao dịch đã thanh toán">
                  {successfulPayments.length === 0 ? (
                    <EmptyState text="Chưa có giao dịch completed/success nào." />
                  ) : (
                    paginate(successfulPayments, pages.revenue).map((payment) => (
                      <View key={payment.id} className="flex-row items-center gap-2 rounded-lg border border-[#e5e9ef] px-2.5 py-[9px]">
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[13px] font-semibold text-[#1e2a36]">{payment.plan_name}</Text>
                          <Text className="text-xs text-[#6c7a88]">{payment.user_id}</Text>
                          <Text className="text-xs text-[#6c7a88]">{new Date(payment.paid_at || payment.created_at).toLocaleString("vi-VN")}</Text>
                        </View>
                        <Text className="text-sm font-bold text-[#27c3a7]">+{formatVnd(payment.amount)}</Text>
                      </View>
                    ))
                  )}
                  <Pagination total={successfulPayments.length} page={pages.revenue} onChange={(page) => setPage("revenue", page)} />
                </Panel>
              </View>
            )}

    </>
  );
}
