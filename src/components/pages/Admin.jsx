import React, { useEffect, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";

function AddProblemPanel({
  onSuccess,
  questions = [],
  onEditSuccess,
  editingQuestion,
  setEditingQuestion,
  onCancelEdit,
}) {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    tags: "",
  });
  const [message, setMessage] = useState("");
  const [csvUploadMessage, setCsvUploadMessage] = useState("");

  // Update formData when editingQuestion changes
  useEffect(() => {
    if (editingQuestion) {
      setFormData({
        title: editingQuestion.title,
        link: editingQuestion.link,
        tags: editingQuestion.tags ? editingQuestion.tags.join(", ") : "",
      });
    } else {
      setFormData({ title: "", link: "", tags: "" });
    }
  }, [editingQuestion]);

  // Handle form input change
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Single add/edit submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    if (editingQuestion) {
      // Edit mode
      try {
        await axios.put(
          `https://backendcodeladder-2.onrender.com/admin/questions/${editingQuestion.question_id || editingQuestion._id}`,
          {
            title: formData.title,
            link: formData.link,
            tags: tagsArray,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-username": username,
            },
          }
        );
        setMessage("✅ Question updated successfully!");
        setFormData({ title: "", link: "", tags: "" });
        setEditingQuestion(null);
        if (onEditSuccess) onEditSuccess();
      } catch (error) {
        const errMsg = error.response?.data?.error || "❌ Server error";
        setMessage(errMsg);
      }
    } else {
      // Add mode
      try {
        await axios.post(
          "https://backendcodeladder-2.onrender.com/addquestion",
          {
            title: formData.title,
            link: formData.link,
            tags: tagsArray,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-username": username,
            },
          }
        );

        setMessage("✅ Question added successfully!");
        setFormData({ title: "", link: "", tags: "" });
        if (onSuccess) onSuccess();
      } catch (error) {
        const errMsg = error.response?.data?.error || "❌ Server error";
        setMessage(errMsg);
      }
    }
  };

  // CSV upload
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          const { title, link, tags } = row;
          if (!title || !link) {
            errorCount++;
            continue;
          }

          const tagsArray =
            tags?.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "") || [];

          try {
            await axios.post(
              "https://backendcodeladder-2.onrender.com/addquestion",
              {
                title,
                link,
                tags: tagsArray,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "x-username": username,
                },
              }
            );
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }

        setCsvUploadMessage(`✅ ${successCount} uploaded, ❌ ${errorCount} failed`);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        setCsvUploadMessage("❌ Failed to parse CSV");
        console.error(err);
      },
    });
  };

  return (
    <div className="mb-10 border border-blue-100 rounded-xl p-6 bg-blue-50">
      <h2 className="text-xl font-bold text-blue-700 mb-2">
        {editingQuestion ? "Edit Problem" : "Add New Problem (Admin)"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-2">
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={formData.title}
          onChange={handleChange}
          required
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none"
        />
        <input
          type="url"
          name="link"
          placeholder="Problem Link"
          value={formData.link}
          onChange={handleChange}
          required
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none"
        />
        <input
          type="text"
          name="tags"
          placeholder="Tags (comma separated)"
          value={formData.tags}
          onChange={handleChange}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none"
        />
        <div className="flex gap-3 items-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition mt-2 w-fit"
          >
            {editingQuestion ? "Update" : "Submit"}
          </button>
          {editingQuestion && (
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-4 py-2 rounded-lg transition mt-2 w-fit"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {message && <p className="mt-2 text-base">{message}</p>}

      {!editingQuestion && (
        <>
          <hr className="my-6" />

          <h3 className="font-bold mb-2">
            Bulk Upload via CSV ( csv must have title,link,tags ) the question failed must have been already in database
          </h3>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="mb-2"
          />
          {csvUploadMessage && <p>{csvUploadMessage}</p>}
        </>
      )}
    </div>
  );
}

function Admin() {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  if (username !== "admin" || !token) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-xl shadow-lg px-8 py-10 max-w-lg w-full text-center">
          <p className="text-red-600 text-xl font-semibold mb-2">Access Denied</p>
          <p className="text-gray-600">
            You must be <span className="font-bold">admin</span> to view this page.
          </p>
        </div>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [ladders, setLadders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Search filters
  const [userSearch, setUserSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [ladderSearch, setLadderSearch] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
    fetchLadders();
    // eslint-disable-next-line
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("https://backendcodeladder-2.onrender.com/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-username": username,
        },
      });
      setUsers(res.data);
    } catch (err) {
      setError("Failed to fetch users");
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get("https://backendcodeladder-2.onrender.com/admin/questions", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-username": username,
        },
      });
      setQuestions(res.data);
    } catch (err) {
      setError("Failed to fetch questions");
    }
  };

  const fetchLadders = async () => {
    try {
      const res = await axios.get("https://backendcodeladder-2.onrender.com/admin/ladders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-username": username,
        },
      });
      setLadders(res.data);
    } catch (err) {
      setError("Failed to fetch ladders");
    }
  };

  // Delete user by username (from URL param)
  const deleteUser = async (userToDelete) => {
    if (!window.confirm(`Delete user '${userToDelete}'? This cannot be undone.`)) return;
    try {
      await axios.delete(
        `https://backendcodeladder-2.onrender.com/admin/users/${userToDelete}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
          },
        }
      );
      setMessage(`User '${userToDelete}' deleted successfully`);
      setError("");
      fetchUsers();
      fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
      setMessage("");
    }
  };

  // Delete question by question_id (from URL param)
  const deleteQuestion = async (questionId) => {
    if (!window.confirm(`Delete question '${questionId}'? This cannot be undone.`)) return;
    try {
      await axios.delete(
        `https://backendcodeladder-2.onrender.com/admin/questions/${questionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
          },
        }
      );
      setMessage(`Question '${questionId}' deleted successfully`);
      setError("");
      fetchQuestions();
      fetchLadders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete question");
      setMessage("");
    }
  };

  // Delete ladder by table_id (from URL param)
  const deleteLadder = async (tableId) => {
    if (!window.confirm(`Delete ladder '${tableId}'? This cannot be undone.`)) return;
    try {
      await axios.delete(
        `https://backendcodeladder-2.onrender.com/admin/ladders/${tableId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
          },
        }
      );
      setMessage(`Ladder '${tableId}' deleted successfully`);
      setError("");
      fetchLadders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete ladder");
      setMessage("");
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredQuestions = questions.filter(
    (q) =>
      q.title.toLowerCase().includes(questionSearch.toLowerCase()) ||
      (q.question_id && q.question_id.toString().includes(questionSearch)) ||
      (Array.isArray(q.tags) && q.tags.join(" ").toLowerCase().includes(questionSearch.toLowerCase()))
  );

  const filteredLadders = ladders.filter(
    (ladder) =>
      (ladder.table_title && ladder.table_title.toLowerCase().includes(ladderSearch.toLowerCase())) ||
      (ladder.table_id && ladder.table_id.toString().includes(ladderSearch))
  );

  // Common scroll style for the lists
  const scrollableListClass =
    "max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50";

  // Cancel edit handler
  const handleCancelEdit = () => setEditingQuestion(null);

  return (
    <div className="max-w-5xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg min-h-[70vh] font-inter">
      <h1 className="text-4xl font-extrabold text-blue-900 mb-8 text-center tracking-tight">
        🛡️ Admin Panel
      </h1>

      {(message || error) && (
        <div
          className={`mb-6 px-4 py-3 rounded text-center font-semibold ${
            error
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Add/Edit Problem Panel */}
      <AddProblemPanel
        onSuccess={fetchQuestions}
        onEditSuccess={fetchQuestions}
        questions={filteredQuestions}
        editingQuestion={editingQuestion}
        setEditingQuestion={setEditingQuestion}
        onCancelEdit={handleCancelEdit}
      />

      {/* Users */}
      <section className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 className="text-2xl font-bold text-blue-700">Users</h2>
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="🔍 Search by username or email..."
            className="w-full sm:w-64 px-3 py-2 rounded border border-gray-300 focus:border-blue-400 focus:outline-none text-base"
          />
        </div>
        <div className={scrollableListClass}>
          {filteredUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found</p>
          ) : (
            <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-gray-50">
              {filteredUsers.map((u) => (
                <li
                  key={u._id}
                  className="flex justify-between items-center px-4 py-3 hover:bg-gray-100 transition"
                >
                  <span>
                    <span className="font-semibold">{u.username}</span>
                    {u.username === "admin" && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full font-medium">
                        admin
                      </span>
                    )}
                    {u.email && (
                      <span className="ml-3 text-gray-500 text-xs">
                        ({u.email})
                      </span>
                    )}
                  </span>
                  {u.username !== "admin" && (
                    <button
                      className="px-3 py-1 rounded bg-gradient-to-r from-red-500 to-red-700 text-white text-xs font-medium hover:from-red-600 hover:to-red-900 transition"
                      onClick={() => deleteUser(u.username)}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Questions */}
      <section className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 className="text-2xl font-bold text-blue-700">Questions</h2>
          <input
            type="text"
            value={questionSearch}
            onChange={(e) => setQuestionSearch(e.target.value)}
            placeholder="🔍 Search by title, tag, or ID..."
            className="w-full sm:w-64 px-3 py-2 rounded border border-gray-300 focus:border-blue-400 focus:outline-none text-base"
          />
        </div>
        <div className={scrollableListClass}>
          {filteredQuestions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No questions found</p>
          ) : (
            <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-gray-50">
              {filteredQuestions.map((q) => (
                <li
                  key={q.question_id || q._id}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-100 transition"
                >
                  <div className="font-semibold text-gray-800 truncate">
                    {q.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {q.tags &&
                      q.tags.length > 0 &&
                      q.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block bg-blue-100 text-blue-900 rounded-full text-xs px-2 py-0.5 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600 gap-2">
                    <span>ID: {q.question_id || q._id}</span>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xs font-medium hover:from-blue-600 hover:to-blue-900 transition"
                        onClick={() => setEditingQuestion(q)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-gradient-to-r from-red-500 to-red-700 text-white text-xs font-medium hover:from-red-600 hover:to-red-900 transition"
                        onClick={() => deleteQuestion(q.question_id || q._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Ladders */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 className="text-2xl font-bold text-blue-700">Ladders</h2>
          <input
            type="text"
            value={ladderSearch}
            onChange={(e) => setLadderSearch(e.target.value)}
            placeholder="🔍 Search by title or ID..."
            className="w-full sm:w-64 px-3 py-2 rounded border border-gray-300 focus:border-blue-400 focus:outline-none text-base"
          />
        </div>
        <div className={scrollableListClass}>
          {filteredLadders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No ladders found</p>
          ) : (
            <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-gray-50">
              {filteredLadders.map((ladder) => (
                <li
                  key={ladder.table_id || ladder._id}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-100 transition"
                >
                  <div className="font-semibold text-gray-800 truncate">
                    {ladder.table_title}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>ID: {ladder.table_id || ladder._id}</span>
                    <button
                      className="px-3 py-1 rounded bg-gradient-to-r from-red-500 to-red-700 text-white text-xs font-medium hover:from-red-600 hover:to-red-900 transition"
                      onClick={() => deleteLadder(ladder.table_id || ladder._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default Admin;