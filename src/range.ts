// Copyright 2024 Yiding Jia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


export function range(end: number): Iterable<number>;
export function range(start: number, end: number, inc?: number): Iterable<number>;
export function* range(
  startOrEnd: number,
  end?: number,
  inc?: number
): Iterable<number> {
  const start = end === undefined ? 0 : startOrEnd;
  end = end === undefined ? startOrEnd : end;
  inc = inc === undefined ? 1 : inc;
  for (let i = start; i < end; i += inc) {
    yield i;
  }
}
