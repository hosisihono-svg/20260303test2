(function () {
  function normalizeLine(line) {
    return line.replace(/\r?\n$/, "");
  }

  function detectStatus(text) {
    if (!text) {
      return { key: "other", label: "不明" };
    }
    if (text.includes("完了") || text.includes("done") || text.includes("Done")) {
      return { key: "done", label: "完了" };
    }
    if (text.includes("進行中") || text.toLowerCase().includes("wip") || text.includes("対応中")) {
      return { key: "in_progress", label: "進行中" };
    }
    if (text.includes("未着手")) {
      return { key: "other", label: "未着手" };
    }
    return { key: "other", label: "不明" };
  }

  function parseReports(rawText) {
    const lines = rawText.split(/\r?\n/).map(normalizeLine);
    const tasks = [];

    let currentDate = "";
    let inTodaySection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // 日付行: "- **日付**: 2026-03-03（火）"
      const dateMatch = line.match(/^-\s*\*\*日付\*\*:\s*(.+)$/);
      if (dateMatch) {
        currentDate = dateMatch[1].trim();
        continue;
      }

      // 見出し判定
      if (line.startsWith("### ")) {
        inTodaySection = line.includes("2) 今日やったこと");
        continue;
      }

      // 「今日やったこと」セクション内のタスク行
      if (inTodaySection && line.startsWith("- **")) {
        // 例: - **(A) タスク名**: 説明...
        const bulletMatch = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.*)$/);
        if (bulletMatch) {
          const labelText = bulletMatch[1].trim();
          const description = bulletMatch[2].trim();
          const status = detectStatus(description);

          tasks.push({
            date: currentDate || "",
            label: labelText,
            statusKey: status.key,
            statusLabel: status.label,
            detail: description
          });
        }
      }
    }

    return tasks;
  }

  function renderSummary(tasks) {
    const container = document.getElementById("summary");
    container.innerHTML = "";

    if (!tasks.length) {
      return;
    }

    const dates = new Set();
    tasks.forEach((t) => {
      if (t.date) dates.add(t.date);
    });

    let doneCount = 0;
    let inProgressCount = 0;
    tasks.forEach((t) => {
      if (t.statusKey === "done") doneCount++;
      else if (t.statusKey === "in_progress") inProgressCount++;
    });

    const cards = [
      {
        label: "日報件数（推定）",
        value: dates.size || 1,
        sub: dates.size ? "日付のユニーク数から推定" : "日付指定がない場合は1件として扱います"
      },
      {
        label: "タスク件数",
        value: tasks.length,
        sub: "「今日やったこと」内の行から抽出"
      },
      {
        label: "完了タスク",
        value: doneCount,
        sub: "文中に「完了 / done」などを含む行"
      },
      {
        label: "進行中タスク",
        value: inProgressCount,
        sub: "文中に「進行中 / WIP / 対応中」などを含む行"
      }
    ];

    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "summary-card";
      el.innerHTML =
        '<div class="summary-card-label">' +
        card.label +
        '</div><div class="summary-card-value">' +
        card.value +
        '</div><div class="summary-card-sub">' +
        card.sub +
        "</div>";
      container.appendChild(el);
    });
  }

  function renderTasks(tasks) {
    const tbody = document.getElementById("tasks-body");
    const noMsg = document.getElementById("no-tasks-message");
    tbody.innerHTML = "";

    if (!tasks.length) {
      noMsg.classList.remove("hidden");
      return;
    }

    noMsg.classList.add("hidden");

    tasks.forEach((task) => {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.className = "task-date";
      tdDate.textContent = task.date || "-";

      const tdLabel = document.createElement("td");
      tdLabel.className = "task-label";
      tdLabel.textContent = task.label;

      const tdStatus = document.createElement("td");
      const span = document.createElement("span");
      let pillClass = "status-other";
      if (task.statusKey === "done") pillClass = "status-done";
      else if (task.statusKey === "in_progress") pillClass = "status-in-progress";
      span.className = "status-pill " + pillClass;
      span.textContent = task.statusLabel;
      tdStatus.appendChild(span);

      const tdDetail = document.createElement("td");
      tdDetail.className = "task-detail";
      tdDetail.textContent = task.detail;

      tr.appendChild(tdDate);
      tr.appendChild(tdLabel);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDetail);

      tbody.appendChild(tr);
    });
  }

  function analyze() {
    const raw = document.getElementById("report-input").value;
    const trimmed = raw.trim();
    const tbody = document.getElementById("tasks-body");
    const noMsg = document.getElementById("no-tasks-message");
    const summary = document.getElementById("summary");

    if (!trimmed) {
      tbody.innerHTML = "";
      summary.innerHTML = "";
      noMsg.textContent = "テキストが入力されていません。日報テキストを貼り付けてから「解析する」を押してください。";
      noMsg.classList.remove("hidden");
      return;
    }

    const tasks = parseReports(trimmed);
    renderSummary(tasks);
    renderTasks(tasks);

    if (!tasks.length) {
      noMsg.textContent = "「### 2) 今日やったこと」配下の行からタスクを見つけられませんでした。テンプレ形式になっているか確認してください。";
      noMsg.classList.remove("hidden");
    }
  }

  function clearAll() {
    const textarea = document.getElementById("report-input");
    const tbody = document.getElementById("tasks-body");
    const summary = document.getElementById("summary");
    const noMsg = document.getElementById("no-tasks-message");

    textarea.value = "";
    tbody.innerHTML = "";
    summary.innerHTML = "";
    noMsg.textContent = "まだタスクが抽出されていません。左側に日報テキストを貼り付けて「解析する」を押してください。";
    noMsg.classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var analyzeButton = document.getElementById("analyze-button");
    var clearButton = document.getElementById("clear-button");

    if (analyzeButton) {
      analyzeButton.addEventListener("click", analyze);
    }

    if (clearButton) {
      clearButton.addEventListener("click", clearAll);
    }
  });
})();

