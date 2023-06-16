export const smth = null;

// function Code({
//     children,
//     element,
//     attributes,
//     elementProps,
//     otherProps,
//     paddingLeft,
//   }: any) {
//     let editor = useSlateStatic()
//     let path = findPath(element)
//     let lang = (element as CodeType).lang || ''
  
//     function setLanguage(lang: any) {
//       const {...newData} = (element as CodeType).data || {}
//       delete newData[HIGHLIGHTER]
  
//       Transforms.setNodes(editor, {lang, data: newData}, {at: path})
//     }
  
//     return (
//       <YStack
//         tag="pre"
//         {...attributes}
//         {...elementProps}
//         {...otherProps}
//         padding="$4"
//         borderRadius="$4"
//         margin={0}
//         elevation="$2"
//         marginLeft={paddingLeft}
//       >
//         <SizableText
//           size="$5"
//           tag="code"
//           fontFamily="$mono"
//           wordWrap="break-word"
//           whiteSpace="break-spaces"
//         >
//           {children}
//         </SizableText>
//         {editor.mode == EditorMode.Draft ? (
//           <XStack
//             //@ts-ignore
//             contentEditable={false}
//             position="absolute"
//             top={-12}
//             right={-8}
//           >
//             <select
//               id="lang-selection"
//               name="lang-selection"
//               value={lang}
//               onChange={(e) => setLanguage(e.target.value as Lang)}
//             >
//               <option value="">Select a Language</option>
//               {BUNDLED_LANGUAGES.map((lang) => (
//                 <option value={lang.id} key={lang.id}>
//                   {lang.id}
//                 </option>
//               ))}
//             </select>
//           </XStack>
//         ) : null}
//       </YStack>
//     )
//   }
  
//   function Blockquote({
//     children,
//     attributes,
//     elementProps,
//     otherProps,
//     paddingLeft,
//   }: any) {
//     return (
//       <YStack
//         tag="blockquote"
//         {...attributes}
//         {...elementProps}
//         {...otherProps}
//         padding="$2"
//         paddingLeft="$4"
//         margin={0}
//         marginLeft={paddingLeft}
//         borderLeftWidth={5}
//         borderLeftColor="$color6"
//       >
//         <SizableText size="$7" fontWeight="500" color="$color9">
//           {children}
//         </SizableText>
//       </YStack>
//     )
//   }