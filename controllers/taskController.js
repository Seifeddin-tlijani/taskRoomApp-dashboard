import Notice from "../models/notification.js";
import Task from "../models/task.js";
import User from "../models/user.js";

export const createTask = async (req, res) => {
  try {
    // Destructure userId from the request body
    const { userId } = req.body;

    const { title, team, stage, date, priority, assets } = req.body;

    let text = "New project has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId, // Use userId directly from the request body
    };

    const task = await Task.create({
      title,
      team,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: [activity], // Wrap activity in an array
    });

    await Notice.create({
      team,
      text,
      task: task._id,
    });

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const duplicateTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    const newTask = await Task.create({
      ...task,
      title: task.title + " - Duplicate",
    });

    newTask.team = task.team;
    newTask.subTasks = task.subTasks;
    newTask.assets = task.assets;
    newTask.priority = task.priority;
    newTask.stage = task.stage;

    await newTask.save();

    //alert users of the task
    let text = "New Project has been assigned to you";
    if (task.team.length > 1) {
      text = text + ` and ${task.team.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${task.date.toDateString()}. Thank you!!!`;

    await Notice.create({
      team: task.team,
      text,
      task: newTask._id,
    });

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const postTaskActivity = async (req, res) => {
  try {
    const { id } = req.params; 
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid Task ID." });
    }
    const { userId, type, activity } = req.body;


    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    const data = {
      type,
      activity,
      by: userId,
    };

    task.activities.push(data);

    await task.save();

    res.status(200).json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Internal server error." });
  }
};



export const dashboardStatistics = async (req, res) => {
  try {
    // Fetch all tasks without considering user permissions
    const allTasks = await Task.find({ isTrashed: false })
      .populate({
        path: "team",
        select: "name role title email",
      })
      .sort({ _id: -1 });

    const users = await User.find({ isActive: true })
      .select("name title role isAdmin createdAt")
      .limit(10)
      .sort({ _id: -1 });

    // Group tasks by stage and calculate counts
    const groupTasks = allTasks.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    // Group tasks by priority
    const groupData = Object.entries(
      allTasks.reduce((result, task) => {
        const { priority } = task;

        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // Calculate total tasks
    const totalTasks = allTasks.length;
    const lastTasks = allTasks.slice(0, 10);

    const summary = {
      totalTasks,
      lastTasks,
      users,
      tasks: groupTasks,
      graphData: groupData,
    };

    res.status(200).json({
      status: true,
      message: "Successfully",
      ...summary,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const { stage, isTrashed } = req.query;

    let query = { isTrashed: isTrashed ? true : false };

    if (stage) {
      query.stage = stage;
    }

    let queryResult = Task.find(query)
      .populate({
        path: "team",
        select: "name title email",
      })
      .sort({ _id: -1 });

    const tasks = await queryResult;

    res.status(200).json({
      status: true,
      tasks,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
 
export const getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate({
        path: "team",
        select: "name title role email",
      })
      .populate({
        path: "activities.by",
        select: "name",
      });

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const createSubTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, stage, priority, team } = req.body;
 // Ensure 'id' is valid before proceeding
 if (!id) {
  return res.status(400).json({ status: false, message: "Invalid task ID." });
}
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: 'Task not found.' });
    }

    // Create a new subtask object based on the provided data
    const newSubTask = {
      title: title || 'Untitled Subtask',
      description: description || '',
      date: date || new Date(),
      stage: stage || 'TODO', // Default stage to 'todo' if not provided
      priority: priority || 'NORMAL', // Default priority to 'normal' if not provided
      team: team || [], // Default team to an empty array if not provided
    };

    // Push the new subtask into the task's subTasks array
    task.subTasks.push(newSubTask);

    // Save the updated task document
    await task.save();

    res.status(200).json({ status: true, message: 'Subtask created successfully.', subTask: newSubTask });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateSubTask = async (req, res) => {
  try {
    const { taskId, subTaskId } = req.params;
    const { title, description, date, stage , priority, team } = req.body;

    const task = await Task.findById(taskId);

    // Find the subtask within the task's subtasks array by subTaskId
    const subTask = task.subTasks.id(subTaskId);

    //  if the subtask exists
    if (!subTask) {
      return res.status(404).json({ status: false, message: "Subtask not found." });
    }
    if (title) subTask.title = title;
    if (description) subTask.description = description;
    if (date) subTask.date = date;
    if (priority) subTask.priority = priority;
    if (stage) subTask.stage = stage;
    if (team) subTask.team = team;

    // Save the updated task
    await task.save();

    res.status(200).json({ status: true, message: "Subtask updated successfully.", subTask });
  } catch (error) {
    console.error("Error updating subtask:", error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getSubTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ status: false, message: 'Task not found.' });
    }
    const subTask = task.subTasks.find((sub) => sub._id.toString() === subTaskId);
    if (!subTask) {
      return res.status(404).json({ status: false, message: 'Subtask not found.' });
    }
    res.status(200).json({ status: true, subTask });
  } catch (error) {
    console.error('Error fetching subtask:', error);
    return res.status(500).json({ status: false, message: 'Internal server error.' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, team, stage, priority } = req.body;

    const task = await Task.findById(id);

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.stage = stage.toLowerCase();
    task.team = team;

    await task.save();

    res.status(200).json({ status: true, message: "Task updated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const trashTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const deleteRestoreTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);

      resp.isTrashed = false;
      resp.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
