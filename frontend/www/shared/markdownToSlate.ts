export function markdownToSlate(body: string) {
  return [
    {
      type: 'p',
      children: [
        {
          text: body,
        },
      ],
    },
  ]
}
