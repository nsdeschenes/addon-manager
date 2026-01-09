import { text } from "@clack/prompts";

export async function updateCommunityPath() {
  const communityPath = await text({
    message: "Enter the path to your community directory",
    placeholder: "C:/Users/YourUsername/Documents/My Community",
    validate: (value) => {
      if (!value) return "Community path is required";
      return undefined;
    },
  });

  return communityPath;
}
