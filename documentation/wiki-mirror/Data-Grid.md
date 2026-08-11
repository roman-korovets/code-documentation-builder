---
type: wiki-mirror
source: https://github.com/Profitbase/PowerBI-visuals-Gantt/wiki/Data-Grid
source-page: Data Grid
screenshots-described: 11
wiki-sha: 1177a40
screenshot-sources:
  - https://user-images.githubusercontent.com/82056309/194162112-7eced5af-12f7-41b1-9aed-81c40fb9c991.png
  - https://user-images.githubusercontent.com/82056309/194162220-dcc67ad4-23bb-43a8-88c9-7cbc4895b458.png
  - https://user-images.githubusercontent.com/82056309/194162395-54555ff4-9fd7-4614-a692-b9d6002a1eb2.png
  - https://user-images.githubusercontent.com/82056309/194163078-54d32f6e-91db-4b6c-9af3-c2f87aa5b8c6.png
  - https://user-images.githubusercontent.com/82056309/194163447-d1e20e24-9549-4d8e-9cda-3385a8396b21.png
  - https://user-images.githubusercontent.com/82056309/196695823-c464272c-8c79-43d8-ba9d-a845899c4eab.png
  - https://user-images.githubusercontent.com/82056309/196695877-3291eade-5f9b-4c56-adf3-8c8afc5117b5.png
  - https://user-images.githubusercontent.com/82056309/196697160-a00318f3-b189-4286-9168-9e7df993dfa0.png
  - https://user-images.githubusercontent.com/82056309/196697220-3453ab1c-ffdf-4074-859c-81f91b421e52.png
  - https://user-images.githubusercontent.com/82056309/196704653-92ef9c6b-538f-4f43-8f67-b0427d6bb769.png
  - https://user-images.githubusercontent.com/82056309/196704730-50591980-3cdf-44c6-942c-2714ee33aed8.png
---

# Data Grid

The **Data Grid** formatting card styles the left panel of your Gantt visual. You can set custom background colors for each level of your task hierarchy, customize the column headers, format text styles for parent and child rows, and display row totals.

---

## 1. Hierarchy Level Background Colors

You can set a different background color for each level of your task hierarchy. The visual automatically detects how many fields you have dragged into the **Tasks and Hierarchy** bucket and creates a matching color picker for each one:

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Data Grid card, background colors</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:12px;font-weight:600;color:#323130;margin-bottom:6px">&#9662; Data Grid</div>
  <div style="border:2px solid #e23b3b;border-radius:10px;padding:8px 10px;display:inline-block">
    <div style="font-size:11px;color:#323130;margin:0 0 3px">Grouping Background Color</div>
    <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#BBD3E8;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
    <div style="font-size:11px;color:#323130;margin:8px 0 3px">Category Background Color</div>
    <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
    <div style="font-size:11px;color:#323130;margin:8px 0 3px">SubTasks Background Color</div>
    <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#C9D6E5;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  </div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format Pane &rarr; expanded <em>Data Grid</em> card (chevron-down next to the card title). A red hand-drawn annotation box surrounds the three background-color pickers.</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Grouping Background Color</strong> &mdash; color-picker dropdown, light blue-grey swatch
          <span style="display:inline-block;width:11px;height:11px;background:#BBD3E8;border:1px solid #888"></span> approximately #BBD3E8</li>
      <li><strong>Category Background Color</strong> &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
      <li><strong>SubTasks Background Color</strong> &mdash; color-picker dropdown, light blue-grey
          <span style="display:inline-block;width:11px;height:11px;background:#C9D6E5;border:1px solid #888"></span> approximately #C9D6E5</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> Red rounded rectangle drawn around all three color pickers.</li>
  <li><strong>Layout:</strong> Card title "Data Grid" at the top, then the three labeled color pickers stacked vertically in this order: Grouping, Category, SubTasks. Each picker is a small color swatch with a dropdown chevron.</li>
</ul>
</figure>

For example, if you have three fields under **Tasks and Hierarchy**:

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Tasks and Hierarchy field wells</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:11px;color:#605e5c;margin-bottom:6px">Tasks and Hierarchy</div>
  <div style="border:2px solid #e23b3b;border-radius:10px;padding:8px;display:inline-block">
    <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #c8c6c4;border-radius:2px;padding:4px 6px;margin:3px 0;width:150px"><span style="font-size:12px;color:#323130">Grouping</span><span style="font-size:10px;color:#605e5c">&#9662;&nbsp;&nbsp;&#10005;</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #c8c6c4;border-radius:2px;padding:4px 6px;margin:3px 0;width:150px"><span style="font-size:12px;color:#323130">Category</span><span style="font-size:10px;color:#605e5c">&#9662;&nbsp;&nbsp;&#10005;</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #c8c6c4;border-radius:2px;padding:4px 6px;margin:3px 0;width:150px"><span style="font-size:12px;color:#323130">SubTasks</span><span style="font-size:10px;color:#605e5c">&#9662;&nbsp;&nbsp;&#10005;</span></div>
  </div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format/Fields pane &rarr; <em>Tasks and Hierarchy</em> data-role section, showing the fields bound to the hierarchy. A red hand-drawn annotation box surrounds the three field slots.</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Grouping</strong> &mdash; bound field slot with a dropdown chevron and an "&times;" remove button</li>
      <li><strong>Category</strong> &mdash; bound field slot with a dropdown chevron and an "&times;" remove button</li>
      <li><strong>SubTasks</strong> &mdash; bound field slot with a dropdown chevron and an "&times;" remove button</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> Red rounded rectangle drawn around the whole group of three field slots.</li>
  <li><strong>Layout:</strong> Section label "Tasks and Hierarchy" at the top, then the three field slots stacked vertically in the order Grouping, Category, SubTasks &mdash; the same three fields whose background colors are set in the previous card.</li>
</ul>
</figure>

The background colors you pick will apply in order from the top-level parent rows down to the lowest subtasks:

<figure class="screenshot">
<figcaption><strong>Canvas &mdash; Data Grid with background colors applied</strong></figcaption>
<div style="display:inline-block;border:1px solid #d0d0d0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;background:#fff;width:430px">
  <div style="display:flex;gap:12px;padding:6px 10px;border-bottom:1px solid #e5e5e5;color:#0a66c2;font-size:11px"><span>&#8862; Expand all</span><span>&#8863; Collapse all</span><span>&#128269; Zoom in</span><span>&#128269; Zoom out</span></div>
  <div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:600;color:#323130"><span style="flex:1">Tasks</span><span style="width:58px">Manager</span><span style="width:22px;text-align:center">&#128202;</span><span style="width:54px;color:#9a9a9a;font-weight:400;font-size:10px">Apr 2022</span></div>
  <div style="border:2px solid #e23b3b;border-radius:10px;margin:4px;overflow:hidden">
    <div style="display:flex;align-items:center;padding:5px 8px;background:#C3D7EA"><span style="flex:1;color:#323130">&#9662; Getting started</span><span style="width:58px"></span><span style="width:22px"></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#D4E4F1"><span style="flex:1;padding-left:14px;color:#323130">&#9662; Test</span><span style="width:58px"></span><span style="width:22px"></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.1 Go through and update all doc&hellip;</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.2 Extensive testing of features</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.3 Test all buttons</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.4 Test Backend</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.5 Testing UI</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
    <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.6 Audience testing</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:54px"></span></div>
  </div>
</div>
<ul>
  <li><strong>Context:</strong> The rendered Gantt visual on the report canvas, showing the left-hand Data Grid (tree grid) with the chosen Grouping / Category / SubTasks background colors applied. A red hand-drawn annotation box surrounds the grid rows.</li>
  <li><strong>Controls / content:</strong>
    <ul>
      <li>Toolbar across the top: <strong>Expand all</strong>, <strong>Collapse all</strong>, <strong>Zoom in</strong>, <strong>Zoom out</strong> (each with a small icon, blue text).</li>
      <li>Grid column headers: <strong>Tasks</strong>, <strong>Manager</strong>, and a small bar-chart icon column.</li>
      <li>A timeline header column edge is visible on the right reading <strong>Apr 2022</strong>.</li>
      <li>Rows: <em>Getting started</em> (top grouping row, darker blue background) &rarr; <em>Test</em> (sub-group) &rarr; tasks <em>1.1 Go through and update all doc&hellip;</em>, <em>1.2 Extensive testing of features</em>, <em>1.3 Test all buttons</em>, <em>1.4 Test Backend</em>, <em>1.5 Testing UI</em>, <em>1.6 Audience testing</em>. Each task row shows Manager "Tore" and a green status dot
          <span style="display:inline-block;width:11px;height:11px;background:#39B54A;border-radius:50%;border:1px solid #888"></span>.</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> Red rounded rectangle drawn around the grid rows, highlighting the applied row background colors.</li>
  <li><strong>Layout:</strong> Toolbar on top; below it the tree grid with the grouping row tinted a deeper blue and the task rows a lighter blue, indenting from grouping &rarr; sub-group &rarr; tasks. Faint blue/teal taskbar fragments appear at the right edge in the timeline area.</li>
</ul>
</figure>

---

## 2. Formatting the Header Row

You can customize the appearance of the column header row at the top of the data grid using three settings:

- **Header Background Color**: Fills the background of the header bar.
- **Header Font Color**: Sets the color of the column title text.
- **Header Font Size**: Adjusts the title text size.

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Data Grid header options</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:11px;color:#323130;margin:0 0 3px">Header Background Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#1A1A1A;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Header Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Header Font Size</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 6px;width:70px"><span style="font-size:12px;color:#323130">18</span><span style="display:inline-block;font-size:7px;color:#605e5c;line-height:8px;text-align:center">&#9650;<br>&#9660;</span></div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format Pane &rarr; Data Grid card, header-formatting controls.</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Header Background Color</strong> &mdash; color-picker dropdown, very dark (near-black) swatch
          <span style="display:inline-block;width:11px;height:11px;background:#1A1A1A;border:1px solid #888"></span> approximately #1A1A1A</li>
      <li><strong>Header Font Color</strong> &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
      <li><strong>Header Font Size</strong> &mdash; numeric stepper (up/down arrows), value <strong>18</strong></li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Three controls stacked vertically: Header Background Color, Header Font Color, then Header Font Size.</li>
</ul>
</figure>

This allows you to create high-contrast headers to separate column titles from your task rows:

<figure class="screenshot">
<figcaption><strong>Canvas &mdash; formatted Data Grid header row</strong></figcaption>
<div style="display:inline-block;border:1px solid #d0d0d0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;background:#fff;width:430px">
  <div style="display:flex;gap:12px;padding:6px 10px;border-bottom:1px solid #e5e5e5;color:#0a66c2;font-size:11px"><span>&#8862; Expand all</span><span>&#8863; Collapse all</span><span>&#128269; Zoom in</span><span>&#128269; Zoom out</span></div>
  <div style="border:2px solid #e23b3b;border-radius:10px;margin:4px;overflow:hidden">
    <div style="display:flex;align-items:center;padding:7px 10px;background:#1F1F1F;color:#fff;font-weight:600"><span style="flex:1;font-size:14px">Tasks</span><span style="width:58px;font-size:14px">Manager</span><span style="width:22px;text-align:center">&#128202;</span></div>
  </div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#C3D7EA"><span style="flex:1;color:#323130">&#9662; Getting started</span><span style="width:58px"></span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#D4E4F1"><span style="flex:1;padding-left:14px;color:#323130">&#9662; Test</span><span style="width:58px"></span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.1 Go through and update all doc&hellip;</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.2 Extensive testing of features</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#EAF2F9"><span style="flex:1;padding-left:28px;color:#323130">1.3 Test all buttons</span><span style="width:58px;color:#323130">Tore</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
</div>
<ul>
  <li><strong>Context:</strong> The rendered Gantt visual on the canvas, showing the Data Grid header row with the dark background, white font, and size-18 text applied. A red hand-drawn annotation box surrounds the header row.</li>
  <li><strong>Controls / content:</strong>
    <ul>
      <li>Toolbar across the top: <strong>Expand all</strong>, <strong>Collapse all</strong>, <strong>Zoom in</strong>, <strong>Zoom out</strong>.</li>
      <li>Header row: <strong>Tasks</strong> and <strong>Manager</strong> column headers in white text on a near-black background, plus a colorful bar-chart icon on the right
          <span style="display:inline-block;width:11px;height:11px;background:#1A1A1A;border:1px solid #888"></span> dark header / <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> white text.</li>
      <li>Below the header: <em>Getting started</em>, <em>Test</em>, then tasks <em>1.1 Go through and update all doc&hellip;</em>, <em>1.2 Extensive testing of features</em>, <em>1.3 Test all buttons</em>, on light blue row backgrounds.</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> Red rounded rectangle drawn around the dark header row.</li>
  <li><strong>Layout:</strong> Dark header band at the top of the grid (the highlighted area), with the lighter task rows beneath it.</li>
</ul>
</figure>

---

## 3. Node Customization (Parent vs. Child Rows)

You can apply separate text styles for parent rows (which contain subtasks) and leaf rows (the lowest-level tasks with no children).

To do this, select either **Root Node** (parents) or **Child Node** (leaves) from the customization dropdown to reveal their formatting options.

### Root Node (Parent Rows)

Selecting **Root node** lets you customize:

- Font Color, Font Size, and Font Style (Default, Bold, Italic, Underline) for all parent rows.
- **Expanded Node Background Color**: The background fill color of a parent row _only_ when it is expanded.
- **Expanded Node Font Color**: The text color of a parent row _only_ when it is expanded.

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Node Customization, Root node selected</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:11px;color:#323130;margin:0 0 3px">Node Customization</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130">Root node</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#1B4B5A;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Size</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 6px;width:70px"><span style="font-size:12px;color:#323130">17</span><span style="display:inline-block;font-size:7px;color:#605e5c;line-height:8px;text-align:center">&#9650;<br>&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Style</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130;font-weight:700">Bold</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Expanded Node Backgro&hellip;</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Expanded Node Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format Pane &rarr; Data Grid card, Node Customization controls with <em>Root node</em> chosen.</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Node Customization</strong> &mdash; dropdown, value <strong>Root node</strong></li>
      <li><strong>Font Color</strong> &mdash; color-picker dropdown, dark teal/navy swatch
          <span style="display:inline-block;width:11px;height:11px;background:#1B4B5A;border:1px solid #888"></span> approximately #1B4B5A</li>
      <li><strong>Font Size</strong> &mdash; numeric stepper, value <strong>17</strong></li>
      <li><strong>Font Style</strong> &mdash; dropdown, value <strong>Bold</strong></li>
      <li><strong>Expanded Node Background Color</strong> (label truncated as "Expanded Node Backgro&hellip;") &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
      <li><strong>Expanded Node Font Color</strong> &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Controls stacked vertically: Node Customization dropdown at top, then Font Color, Font Size, Font Style, Expanded Node Background Color, Expanded Node Font Color.</li>
</ul>
</figure>

When applied, parent text styles (e.g. bold teal text) stand out:

<figure class="screenshot">
<figcaption><strong>Canvas &mdash; Root node font formatting applied</strong></figcaption>
<div style="display:inline-block;border:1px solid #d0d0d0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;background:#fff;width:400px">
  <div style="display:flex;gap:12px;padding:6px 10px;border-bottom:1px solid #e5e5e5;color:#0a66c2;font-size:11px"><span>&#8862; Expand all</span><span>&#8863; Collapse all</span><span>&#128269; Zoom in</span></div>
  <div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:600;color:#323130"><span style="flex:1">Tasks</span><span style="width:22px;text-align:center">&#128202;</span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;color:#1B6E7A;font-weight:700">&#9662; Getting started</span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:14px;color:#1B6E7A;font-weight:700">&#9662; Test</span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.1 Go through and up&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.2 Extensive testing of&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.3 Test all buttons</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.4 Test Backend</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.5 Testing UI</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.6 Audience testing</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
</div>
<ul>
  <li><strong>Context:</strong> The rendered Data Grid showing the root (parent) node rows in bold, dark-teal text per the Root node settings.</li>
  <li><strong>Controls / content:</strong>
    <ul>
      <li>Toolbar across the top: <strong>Expand all</strong>, <strong>Collapse all</strong>, <strong>Zoom in</strong> (truncated).</li>
      <li>Grid header: <strong>Tasks</strong> column plus the bar-chart icon.</li>
      <li><em>Getting started</em> and <em>Test</em> appear as bold, dark-teal root/parent rows
          <span style="display:inline-block;width:11px;height:11px;background:#1B6E7A;border:1px solid #888"></span> approximately #1B6E7A; child tasks <em>1.1</em>&ndash;<em>1.6</em> are in normal weight with green status dots
          <span style="display:inline-block;width:11px;height:11px;background:#39B54A;border-radius:50%;border:1px solid #888"></span>.</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Tree grid with bold teal parent rows at the top of each branch and lighter, regular-weight child task rows indented beneath.</li>
</ul>
</figure>

You can also make expanded parent rows use a distinct background color (like grey) so open sections of your project are easier to spot:

<figure class="screenshot">
<figcaption><strong>Canvas &mdash; Expanded Node Background color applied</strong></figcaption>
<div style="display:inline-block;border:1px solid #d0d0d0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;background:#fff;width:460px">
  <div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:600;color:#323130"><span style="flex:1">Tasks</span><span style="width:22px;text-align:center">&#128202;</span><span style="width:120px;color:#9a9a9a;font-weight:400;font-size:10px">Jun 20&hellip;</span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#BFBFBF"><span style="flex:1;color:#1B6E7A;font-weight:700">&#9662; Getting started</span><span style="width:22px"></span><span style="width:120px"><span style="display:inline-block;height:10px;width:60px;background:#2E8B8B"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#BFBFBF"><span style="flex:1;padding-left:14px;color:#1B6E7A;font-weight:700">&#9662; Test</span><span style="width:22px"></span><span style="width:120px"><span style="display:inline-block;height:10px;width:36px;background:#2E8B8B"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.1 Go through and up&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:30px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.2 Extensive testing of&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:24px;margin-left:14px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.3 Test all buttons</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:34px;margin-left:24px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.4 Test Backend</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:40px;margin-left:30px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.5 Testing UI</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:28px;margin-left:40px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#323130">1.6 Audience testing</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span><span style="width:120px"><span style="display:inline-block;height:10px;width:30px;margin-left:50px;background:#C9B27A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#BFBFBF"><span style="flex:1;color:#1B6E7A;font-weight:700">&#9656; Website content</span><span style="width:22px"></span><span style="width:120px"><span style="display:inline-block;height:10px;width:48px;background:#2E8B8B"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px;background:#BFBFBF"><span style="flex:1;color:#1B6E7A;font-weight:700">&#9662; Website config</span><span style="width:22px"></span><span style="width:120px"><span style="display:inline-block;height:10px;width:42px;background:#2E8B8B"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:14px;color:#1B6E7A;font-weight:700">&#9662; Design</span><span style="width:22px"></span><span style="width:120px"></span></div>
</div>
<ul>
  <li><strong>Context:</strong> The rendered Data Grid showing expanded parent/grouping rows with a grey background (the Expanded Node Background Color), alongside the bold teal root text.</li>
  <li><strong>Controls / content:</strong>
    <ul>
      <li>Rows top to bottom: <em>Getting started</em> (expanded root, grey background, bold teal text), <em>Test</em> (bold teal), tasks <em>1.1</em>&ndash;<em>1.6</em> with green status dots, <em>Website content</em> (collapsed root, teal), <em>Website config</em> (expanded root, grey background, bold teal), <em>Design</em> (sub).</li>
      <li>Expanded/grouping rows carry a grey fill
          <span style="display:inline-block;width:11px;height:11px;background:#BFBFBF;border:1px solid #888"></span> approximately #BFBFBF.</li>
      <li>Right side: teal and tan/khaki taskbars in the timeline; a timeline header reading <strong>Jun 20&hellip;</strong> is partly visible.</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Tree grid on the left with grey-filled expanded parent rows; the timeline with colored taskbars on the right.</li>
</ul>
</figure>

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Root node with grey Expanded Node Background</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:11px;color:#323130;margin:0 0 3px">Node Customization</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130">Root node</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#1B4B5A;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Size</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 6px;width:70px"><span style="font-size:12px;color:#323130">17</span><span style="display:inline-block;font-size:7px;color:#605e5c;line-height:8px;text-align:center">&#9650;<br>&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Style</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130;font-weight:700">Bold</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Expanded Node Backgro&hellip;</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#BFBFBF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Expanded Node Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format Pane &rarr; Data Grid card, Node Customization set to <em>Root node</em>, with the Expanded Node Background Color now changed to grey (matching the previous canvas).</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Node Customization</strong> &mdash; dropdown, value <strong>Root node</strong></li>
      <li><strong>Font Color</strong> &mdash; color-picker dropdown, dark teal/navy
          <span style="display:inline-block;width:11px;height:11px;background:#1B4B5A;border:1px solid #888"></span> approximately #1B4B5A</li>
      <li><strong>Font Size</strong> &mdash; numeric stepper, value <strong>17</strong></li>
      <li><strong>Font Style</strong> &mdash; dropdown, value <strong>Bold</strong></li>
      <li><strong>Expanded Node Background Color</strong> (label truncated as "Expanded Node Backgro&hellip;") &mdash; color-picker dropdown, grey
          <span style="display:inline-block;width:11px;height:11px;background:#BFBFBF;border:1px solid #888"></span> approximately #BFBFBF</li>
      <li><strong>Expanded Node Font Color</strong> &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Same vertical control stack as the earlier Root node screenshot; the only visible change is the grey Expanded Node Background Color swatch.</li>
</ul>
</figure>

### Child Node (Lowest-Level Task Rows)

Selecting **Child node** allows you to set the Font Color, Font Size, and Font Style (Default, Bold, Italic, Underline) specifically for your lowest-level tasks:

<figure class="screenshot">
<figcaption><strong>Format Pane &mdash; Node Customization, Child node selected</strong></figcaption>
<div style="display:inline-block;background:#f3f2f1;border:1px solid #e1dfdd;border-radius:3px;padding:10px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <div style="font-size:11px;color:#323130;margin:0 0 3px">Node Customization</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130">Child node</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Color</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 5px;width:56px"><span style="width:30px;height:14px;background:#FFFFFF;border:1px solid #b0b0b0;display:inline-block"></span><span style="font-size:8px;color:#605e5c">&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Size</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:3px 6px;width:70px"><span style="font-size:12px;color:#323130">14</span><span style="display:inline-block;font-size:7px;color:#605e5c;line-height:8px;text-align:center">&#9650;<br>&#9660;</span></div>
  <div style="font-size:11px;color:#323130;margin:8px 0 3px">Font Style</div>
  <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8c6c4;background:#fff;border-radius:2px;padding:4px 8px;width:150px"><span style="font-size:12px;color:#323130;text-decoration:underline">Underline</span><span style="font-size:9px;color:#605e5c">&#9660;</span></div>
</div>
<ul>
  <li><strong>Context:</strong> Power BI Format Pane &rarr; Data Grid card, Node Customization with <em>Child node</em> chosen (the lowest level of the hierarchy).</li>
  <li><strong>Controls:</strong>
    <ul>
      <li><strong>Node Customization</strong> &mdash; dropdown, value <strong>Child node</strong></li>
      <li><strong>Font Color</strong> &mdash; color-picker dropdown, white
          <span style="display:inline-block;width:11px;height:11px;background:#FFFFFF;border:1px solid #888"></span> #FFFFFF</li>
      <li><strong>Font Size</strong> &mdash; numeric stepper, value <strong>14</strong></li>
      <li><strong>Font Style</strong> &mdash; dropdown, value <strong>Underline</strong></li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Controls stacked vertically: Node Customization dropdown, Font Color, Font Size, Font Style. (Child node exposes fewer options than Root node &mdash; no expanded-node background/font color.)</li>
</ul>
</figure>

For example, you can set child tasks to render with underlined text:

<figure class="screenshot">
<figcaption><strong>Canvas &mdash; Child node font formatting applied</strong></figcaption>
<div style="display:inline-block;border:1px solid #d0d0d0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;background:#fff;width:400px">
  <div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:600;color:#323130"><span style="flex:1">Tasks</span><span style="width:22px;text-align:center">&#128202;</span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;color:#1B6E7A;font-weight:700">&#9662; Getting started</span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:14px;color:#1B6E7A;font-weight:700">&#9662; Test</span><span style="width:22px"></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.1 Go through and up&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.2 Extensive testing of&hellip;</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.3 Test all buttons</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.4 Test Backend</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.5 Testing UI</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
  <div style="display:flex;align-items:center;padding:5px 8px"><span style="flex:1;padding-left:28px;color:#0a66c2;text-decoration:underline">1.6 Audience testing</span><span style="width:22px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#39B54A"></span></span></div>
</div>
<ul>
  <li><strong>Context:</strong> The rendered Data Grid showing the child (leaf) task rows with underlined text per the Child node settings.</li>
  <li><strong>Controls / content:</strong>
    <ul>
      <li>Grid header: <strong>Tasks</strong> column plus the colorful bar-chart icon.</li>
      <li><em>Getting started</em> and <em>Test</em> remain bold teal root rows.</li>
      <li>Child tasks <em>1.1 Go through and up&hellip;</em>, <em>1.2 Extensive testing of&hellip;</em>, <em>1.3 Test all buttons</em>, <em>1.4 Test Backend</em>, <em>1.5 Testing UI</em>, <em>1.6 Audience testing</em> are shown in underlined blue text, each with a green status dot
          <span style="display:inline-block;width:11px;height:11px;background:#39B54A;border-radius:50%;border:1px solid #888"></span>.</li>
    </ul>
  </li>
  <li><strong>Annotations:</strong> None.</li>
  <li><strong>Layout:</strong> Tree grid with bold teal parent rows and underlined child task rows indented beneath them.</li>
</ul>
</figure>

---

## 4. Show Row Totals

_(New in Gantt v3.x)_

The **Show Row Totals** toggle adds aggregate/summary values to parent rows in numeric columns.

- **When turned Off (default)**: Parent rows will not show numeric summaries in the grid.
- **When turned On**: Parent rows automatically show the sum or roll-up values of all their children for numeric columns.
