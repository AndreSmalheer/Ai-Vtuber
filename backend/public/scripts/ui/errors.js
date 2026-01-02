export function show_error(error) {
  const existing = document.getElementById("error_container");
  if (existing) {
    existing.remove();
  }

  const error_container = document.createElement("div");
  error_container.id = "error_container";
  error_container.innerHTML = error;

  document.body.append(error_container);
}
