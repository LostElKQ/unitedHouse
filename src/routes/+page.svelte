<script lang="ts">
  import * as t from "file-type";

  let files = $state<FileList>();
  let fileData = $state.raw<unknown[]>([]);
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<form
  method="POST"
  onsubmit={async (e) => {
    e.preventDefault();
    if (!files) {
      return;
    }
    const data = [];
    for (const file of files) {
      const filetype = await t.fileTypeFromBlob(file);
      console.log(filetype, file.type);
      data.push(filetype);
    }
    fileData = data;
  }}
>
  <label>
    dkaldal
    <input id="fileInput" type="file" bind:files />
  </label>
  <button>submin</button>
</form>

{JSON.stringify(fileData, null, 4)}
