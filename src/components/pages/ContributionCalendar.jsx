import React, { useEffect, useState } from "react";
import axios from "axios";

const ContributionCalendar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem("username") || "admin";
  const getDateString = (date) => date.toISOString().split("T")[0];
  const getStartOfYear = (date) => new Date(date.getFullYear(), 0, 1);
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };
  const getDaysInYear = (year) =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

  const fetchData = async () => {
    try {
      const res = await axios.get(`https://backendcodeladder-2.onrender.com/usersubmissions/${username}`);
      const submissions = res.data?.submissions?.filter((s) => s.marked && s.date) || [];

      const map = new Map();
      submissions.forEach((s) => {
        const day = s.date.split("T")[0];
        map.set(day, (map.get(day) || 0) + 1);
      });

      const today = new Date();
      const year = today.getFullYear();
      const start = getStartOfYear(today);
      const days = getDaysInYear(year);

      const contributions = [];
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const dateStr = getDateString(d);
        contributions.push({
          date: dateStr,
          count: map.get(dateStr) || 0,
          dateObj: d,
          dayOfWeek: d.getDay(),
          month: d.getMonth(),
        });
      }

      setData(contributions);
    } catch (err) {
      console.error("Failed to fetch submission data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getColor = (count) => {
    if (count === 0) return "#ebedf0";
    if (count === 1) return "#c6e48b";
    if (count === 2) return "#7bc96f";
    if (count === 3) return "#239a3b";
    return "#196127";
  };

  const formatDate = (date) => {
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${m[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const weeks = (() => {
    const grouped = [];
    let current = new Array(7).fill(null);

    if (data.length) {
      for (let i = 0; i < data[0].dayOfWeek; i++) current[i] = null;
    }

    data.forEach((entry, i) => {
      current[entry.dayOfWeek] = entry;
      if (entry.dayOfWeek === 6 || i === data.length - 1) {
        grouped.push([...current]);
        current = new Array(7).fill(null);
      }
    });
    return grouped;
  })();

  const monthLabels = (() => {
    const labels = [];
    let currentMonth = -1;
    weeks.forEach((week, i) => {
      const first = week.find((d) => d !== null);
      if (first && first.month !== currentMonth) {
        currentMonth = first.month;
        labels.push({ month: formatDate(first.dateObj).split(" ")[0], position: i });
      }
    });
    return labels;
  })();

  const totalContributions = data.reduce((sum, d) => sum + d.count, 0);
  const longestStreak = (() => {
    let streak = 0, max = 0;
    for (let d of data) {
      streak = d.count > 0 ? streak + 1 : 0;
      max = Math.max(max, streak);
    }
    return max;
  })();

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">Loading contribution calendar...</div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-2">Contribution Calendar</h1>
          <p className="mb-6 text-gray-600">{totalContributions} contributions in {new Date().getFullYear()}</p>

          <div className="flex text-xs mb-2 ml-10 gap-10 relative">
            {monthLabels.map(({ month, position }) => (
              <span key={month} className="absolute left-[calc(15px*${position})]">{month}</span>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col mr-2 text-xs text-gray-400">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((day, i) => (
                <div key={i} style={{ height: "12px", marginBottom: "3px" }}>{day}</div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 15px)` }}>
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    title={day ? `${formatDate(day.dateObj)}: ${day.count} contributions` : ""}
                    style={{
                      width: "12px",
                      height: "12px",
                      margin: "1.5px",
                      backgroundColor: day ? getColor(day.count) : "transparent",
                      borderRadius: "2px",
                    }}
                    className="hover:opacity-80 transition"
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Longest streak: {longestStreak} days</span>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              Less
              {[0, 1, 2, 3, 4].map((v) => (
                <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(v) }} />
              ))}
              More
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionCalendar;
